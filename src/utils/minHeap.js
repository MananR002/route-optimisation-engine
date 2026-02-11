/**
 * Simple MinHeap (priority queue) for Dijkstra optimization.
 * Supports decrease-key via re-insert (common JS heap pattern for readability).
 * Operations: O(log N) for insert/extract.
 * Used to achieve O((V + E) log V) Dijkstra.
 * Readable, no external deps.
 */
class MinHeap {
  constructor() {
    this.heap = [];
    this.nodeIndices = new Map(); // Track positions for potential decrease-key (simplified)
  }

  /**
   * Insert node with priority (distance).
   * @param {string} node - Graph node key
   * @param {number} priority - Distance
   */
  insert(node, priority) {
    this.heap.push({ node, priority });
    this.nodeIndices.set(node, this.heap.length - 1);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Extract min priority node.
   * @returns {{node: string, priority: number}|null}
   */
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) {
      const min = this.heap.pop();
      this.nodeIndices.delete(min.node);
      return min;
    }
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.nodeIndices.set(this.heap[0].node, 0);
    this.nodeIndices.delete(min.node);
    this._bubbleDown(0);
    return min;
  }

  /**
   * Decrease priority for a node (re-insert for simplicity/readability; sufficient for small graphs).
   * @param {string} node 
   * @param {number} newPriority
   */
  decreaseKey(node, newPriority) {
    const idx = this.nodeIndices.get(node);
    if (idx !== undefined && newPriority < this.heap[idx].priority) {
      this.heap[idx].priority = newPriority;
      this._bubbleUp(idx);
    } else {
      // Fallback: re-insert (allows multiple entries; extract skips outdated)
      this.insert(node, newPriority);
    }
  }

  _bubbleUp(index) {
    let parent = Math.floor((index - 1) / 2);
    while (index > 0 && this.heap[index].priority < this.heap[parent].priority) {
      this._swap(index, parent);
      index = parent;
      parent = Math.floor((index - 1) / 2);
    }
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest !== index) {
        this._swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
    this.nodeIndices.set(this.heap[i].node, i);
    this.nodeIndices.set(this.heap[j].node, j);
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

module.exports = MinHeap;