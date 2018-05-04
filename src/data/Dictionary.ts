export class Dictionary<T> {
    values: T[] = [];
    private valuesByName: { [key: string]: T } = {};

    getByName(key: string) {
        return this.valuesByName[key];
    }

    add(key: string, value: T) {
        if (!this.contains(key)) {
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
}