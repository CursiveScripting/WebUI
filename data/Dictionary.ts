namespace Cursive {
    export class Dictionary<T>
    {
        private valuesByName: { [key: string]: T } = {};
        private valuesByIndex: T[] = [];

        getByName(key: string) {
            return this.valuesByName[key];
        }

        add(key: string, value: T) {
            if (!this.contains(key))
                this.valuesByIndex.push(value);
            this.valuesByName[key] = value;
        }

        contains(key: string) {
            return this.valuesByName.hasOwnProperty(key);
        }

        get count() {
            return this.valuesByIndex.length;
        }

        getByIndex(index: number) {
            return this.valuesByIndex[index];
        }

        remove(key: string) {
            let value = this.valuesByName[key];
            delete this.valuesByName[key];

            let index = this.valuesByIndex.indexOf(value);
            this.valuesByIndex.splice(index, 1);
        }
    }
}