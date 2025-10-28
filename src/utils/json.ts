import _ from 'lodash';

export function getSafe(root: object | null | undefined, key: string | number): any | null | undefined {
    if (!root || !root.hasOwnProperty(key)) {
        return undefined;
    }
    return root[key as keyof typeof root];
}

export function isSkippedJSONNode(skipOpts: any[] | undefined, child: object, index: number): boolean {
    const skip = skipOpts;
    if (!skip) return false;

    for (const s of skip) {
        if (_isSkippedJsonNode(s, child, index))
            return true;
    }

    return false;
}

function _isSkippedJsonNode(s: any, child: object, index: number): boolean {
    const {
        find, text, type,
        position
    } = s;

    if (find !== undefined) {
        let root: any = child;
        for (const key of find) {
            root = getSafe(root, key);
        }

        if (text !== undefined) {
            if (type === undefined || type === 'exact')
                return root === text;
            else if (type === 'contains') {
                if (typeof root === 'string' || Array.isArray(root)) {
                    return root.includes(text);
                }
            }
        }

        return false;
    } else if (text !== undefined) {
        if (type === undefined || type === 'exact')
            return child === text;
        else if (type === 'contains') {
            if (typeof child === 'string' || Array.isArray(child)) {
                return child.includes(text);
            }
        }
    } else if (position !== undefined) {
        return index == position || `${position}` == `${index}`;
    }

    return false;
}

export function deepmerge<T, E>(a: T, b: E): T & E {
    return _.mergeWith({}, a, b, (o, s) => {
        if (typeof o == 'object' && !Array.isArray(o) && typeof o != 'function' && typeof s != 'function')
            return deepmerge(s, o);
        return s != null ? s : o;
    });
}
