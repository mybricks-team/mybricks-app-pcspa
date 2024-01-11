const originalGetItem = localStorage.getItem;
export const proxLocalStorage = (mockData = []) => {
    const data = getCheckedMockDataMap(mockData)
    localStorage.getItem = function(key) {
        if(key in data) {
            return data[key]
        }
        return originalGetItem.apply(this, arguments);
    };

    return () => {
        localStorage.getItem = originalGetItem
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