export function findInMap<K, V>(map: Map<K, V>, predicate: (v: V) => boolean) {
    for (let [k, v] of map) {
        if (predicate(v)) { 
            return v; 
        }
    }
}