import os
import json
import numpy as np
from typing import List, Dict, Any, Tuple
from app.config import settings

# Safe imports for FAISS and Sentence Transformers
faiss_loaded = False
transformers_loaded = False

try:
    import faiss
    faiss_loaded = True
except ImportError:
    print("WARNING: FAISS package not installed. Falling back to NumPy matrix calculations.")
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
    transformers_loaded = True
except ImportError:
    print("WARNING: SentenceTransformers package not installed. Running in mock embedder mode.")
    SentenceTransformer = None

class EmbeddingService:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if transformers_loaded and self._model is None:
            try:
                print("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
                self._model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                print(f"Error loading model: {e}")
        return self._model

    def get_embedding(self, text: str) -> np.ndarray:
        """Generate L2-normalized embedding for a single text."""
        model = self.model
        if transformers_loaded and model:
            try:
                embedding = model.encode(text)
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                return embedding
            except Exception as e:
                print(f"Embedding error: {e}")
                
        # Heuristic fallback: generate deterministic vector based on text content
        v = np.zeros(384)
        text_clean = text.lower()
        for i, char in enumerate(text_clean[:384]):
            val = ord(char)
            # project characters to dimensions
            idx = (val * (i + 1)) % 384
            v[idx] += 1
        
        # normalize
        norm = np.linalg.norm(v)
        if norm > 0:
            v = v / norm
        return v

    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate L2-normalized embeddings for a list of texts."""
        model = self.model
        if transformers_loaded and model:
            try:
                embeddings = model.encode(texts)
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms[norms == 0] = 1.0
                return embeddings / norms
            except Exception as e:
                print(f"Batch embedding error: {e}")
                
        # Generate list of fallbacks
        vec_list = [self.get_embedding(t) for t in texts]
        return np.vstack(vec_list)

    def create_and_save_index(self, job_id: int, resumes: List[Dict[str, Any]]) -> str:
        """
        Create a similarity index for a specific job description.
        resumes: list of dicts with {'resume_id': int, 'text': str}
        """
        if not resumes:
            return ""

        texts = [r['text'] for r in resumes]
        embeddings = self.get_embeddings(texts)
        
        # Save metadata mapping index ID to Resume ID
        metadata_path = os.path.join(settings.FAISS_INDEX_DIR, f"job_{job_id}_metadata.json")
        metadata = {str(i): resumes[i]['resume_id'] for i in range(len(resumes))}
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)

        if faiss_loaded:
            try:
                dimension = embeddings.shape[1]
                index = faiss.IndexFlatIP(dimension)
                index.add(embeddings.astype('float32'))
                index_path = os.path.join(settings.FAISS_INDEX_DIR, f"job_{job_id}.index")
                faiss.write_index(index, index_path)
                return index_path
            except Exception as e:
                print(f"FAISS indexing error, falling back to NumPy matrix save: {e}")

        # Fallback NumPy Index: save as .npy file
        npy_path = os.path.join(settings.FAISS_INDEX_DIR, f"job_{job_id}.npy")
        np.save(npy_path, embeddings.astype('float32'))
        return npy_path

    def search_index(self, job_id: int, query_text: str, k: int = 100) -> List[Tuple[int, float]]:
        """
        Search similarity index for the given job_id with the query_text.
        Returns a list of (resume_id, similarity_score)
        """
        index_path = os.path.join(settings.FAISS_INDEX_DIR, f"job_{job_id}.index")
        npy_path = os.path.join(settings.FAISS_INDEX_DIR, f"job_{job_id}.npy")
        metadata_path = os.path.join(settings.FAISS_INDEX_DIR, f"job_{job_id}_metadata.json")
        
        if not os.path.exists(metadata_path):
            return []

        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

        query_vector = self.get_embedding(query_text).reshape(1, -1).astype('float32')

        # Check if FAISS file exists
        if faiss_loaded and os.path.exists(index_path):
            try:
                index = faiss.read_index(index_path)
                total_items = index.ntotal
                search_k = min(k, total_items)
                if search_k <= 0:
                    return []
                distances, indices = index.search(query_vector, search_k)
                results = []
                for dist, idx in zip(distances[0], indices[0]):
                    if str(idx) in metadata:
                        results.append((metadata[str(idx)], float(dist)))
                return results
            except Exception as e:
                print(f"FAISS search failed, trying NumPy search: {e}")

        # Fallback NumPy Matrix Search (performs exact FlatIP calculation: dot products)
        if os.path.exists(npy_path):
            try:
                embeddings = np.load(npy_path)
                # Compute cosine similarity using dot product
                # query_vector shape: (1, 384), embeddings shape: (N, 384)
                scores = np.dot(embeddings, query_vector.T).flatten()  # shape: (N,)
                
                # Get top K indices sorted descending by score
                top_indices = np.argsort(scores)[::-1][:k]
                
                results = []
                for idx in top_indices:
                    if str(idx) in metadata:
                        results.append((metadata[str(idx)], float(scores[idx])))
                return results
            except Exception as e:
                print(f"NumPy vector search error: {e}")

        return []

embedding_service = EmbeddingService()
