# LRU Cache with O(1) Operations

**Course:** CS 621 — Algorithms & Data Structures, Fall 2025  
**Assignment:** Problem Set 3, Problem 2  
**Submitted:** 14 October 2025

## 1. Problem statement

Implement an LRU cache supporting `get(key)` and `put(key, value)`, both in worst-case O(1) time, for a fixed capacity `cap`. When inserting into a full cache, evict the entry least recently accessed, where "accessed" includes both reads and writes. Behaviour must match LeetCode problem 146 exactly, including that `put` on an existing key counts as an access and updates recency rather than triggering eviction.

## 2. Data-structure choice

I went with the canonical combination: a hash map from keys to node pointers, plus a doubly linked list threaded through those nodes in recency order. The hash map gives O(1) key lookup, and the doubly linked list gives O(1) removal of an arbitrary node — which I need because `get` has to splice a hit to the front. A singly linked list doesn't work because removing an arbitrary node needs its predecessor. An array-backed "move-to-front" structure would be O(n) under shifts, which kills the asymptotic bound.

I considered Python's `collections.OrderedDict`, which CPython implements with essentially the same structure internally. I rejected it because the assignment says "implement your own", and I want to come back and compare memory footprints against the hand-rolled version as a follow-up.

## 3. Implementation

```python
class Node:
    __slots__ = ("key", "val", "prev", "next")

    def __init__(self, key: int, val: int):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map: dict[int, Node] = {}
        # Sentinel head/tail — let insert/remove skip None checks.
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node: Node) -> None:
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)
        self._add_to_front(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.map:
            node = self.map[key]
            node.val = value
            self._remove(node)
            self._add_to_front(node)
            return
        if len(self.map) == self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]
        node = Node(key, value)
        self.map[key] = node
        self._add_to_front(node)
```

## 4. Complexity analysis

Both `get` and `put` are worst-case O(1). Map operations are O(1) amortized; each linked-list operation touches a constant number of pointers regardless of cache size. Space is O(capacity) for the map plus O(capacity) for the list nodes.

The only constant-factor hotspot is eviction, where I drop the LRU node from both the list and the map. I added `__slots__` on `Node` hoping to bring per-node memory close to what `OrderedDict` uses, but I have not measured this.

## 5. Edge cases

- `put` on an existing key: refreshes value and recency, no eviction.
- `put` on a brand-new key when the cache is at capacity: evicts exactly one entry.
- `get` on a missing key: returns -1 and does not touch list state.
- Capacity 1: still correct because the sentinel nodes are not counted in `len(self.map)`.
- Negative or zero keys: pass through fine, since I never compare keys by value, only by identity through the map.

## 6. Results

I ran the standard 14-case LeetCode test battery and a fuzz test that does 50,000 random ops per run against a reference dict-plus-deque implementation, 100 runs with different seeds. Zero divergences. Throughput is about 1.8 ms per 1000 ops on my laptop (M2, Python 3.11). I have not benchmarked against `OrderedDict`, but I would expect a small constant-factor win for `OrderedDict` because its `move_to_end` and `popitem` are C-level.

## 7. Things I want to follow up on

The thread-safety question is the obvious next one. As written the cache is not safe under concurrent access, and I am not sure whether a coarse lock around the cache is enough or if a reader-writer lock is the right answer. I will bring it up in office hours.
