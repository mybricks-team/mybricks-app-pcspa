const originalLocalGetItem = localStorage.getItem;
export const proxLocalStorage = (mockData = []) => {
    const data = getCheckedMockDataMap(mockData)
    localStorage.getItem = function(key) {
        if(key in data) {
            return data[key]
        }
        return originalLocalGetItem.apply(this, arguments);
    };

    return () => {
        localStorage.getItem = originalLocalGetItem
    }
}

const originSessionGetItem = sessionStorage.getItem
export const proxSessionStorage = (mockData = []) => {
    const data = getCheckedMockDataMap(mockData)
    sessionStorage.getItem = function(key) {
        if(key in data) {
            return data[key]
        }
        return originSessionGetItem.apply(this, arguments);
    };

    return () => {
        sessionStorage.getItem = originSessionGetItem
    }
}

export const getCheckedMockDataMap = (originMockDate) => {
    return originMockDate.reduce((res, item) => {
        const { key, value, checked } = item
        if(checked) {
            res[key] = value
        }
        return res
    }, {})
}