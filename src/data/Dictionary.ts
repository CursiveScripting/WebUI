export class Dictionary<T> {
    values: T[] = [];
    private valuesByName: { [key: string]: T } = {};

    getByName(key: string): T | null {
        let val = this.valuesByName[key];
        return val === undefined ? null : val;
    }

    add(key: string, value: T) {
        if (this.contains(key)) {
            // update the value stored for this key
            let prevValue = this.valuesByName[key];
            if (prevValue !== value) {
                let index = this.values.indexOf(prevValue);
                this.values.splice(index, 1, value);
            }
        }
        else {
            this.values.push(value);
        }
        this.valuesByName[key] = value;
    }

    contains(key: string) {
        return this.valuesByName.hasOwnProperty(key);
    }

    get count() {
        return this.values.length;
    }

    remove(key: string) {
        let value = this.valuesByName[key];
        delete this.valuesByName[key];

        let index = this.values.indexOf(value);
        this.values.splice(index, 1);
    }

    clear() {
        this.valuesByName = {};
        this.values = [];
    }
    
    getAllKeys() {
        const allKeys = [];
        
        for (const key in this.valuesByName) {
            if (this.valuesByName.hasOwnProperty(key)) {
                allKeys.push(key);
            }
        }

        return allKeys;
    }
}