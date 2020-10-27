
export function stringAsSql(str: string):string {
    return "'"+str.replace(/./g, function (char: string): string {
        switch (char) {
            case "'":
                return "''";
            default:
                return char;
        }
    })+"'";
}
