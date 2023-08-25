let arbitrum = exports.arbitrum = "arbitrum";
let optimism = exports.optimism = "optimism";


exports.deployOption = function (accounts) {
    return {from: accounts[0], overwrite: true}
}
exports.getAdmin = function (accounts) {
    return accounts[0];
}

exports.tokenName = function (network) {
    switch (network){
        default:
            return 'Trends Chat Token';
    }
}


exports.tokenSymbol = function (network) {
    switch (network){
        default:
            return 'TRENDS';
    }
}

exports.lzEndpoints = function (network) {
    switch (network){
        case arbitrum:
            return '0x3c2269811836af69497E5F486A85D7316753cf62'
        case optimism:
            return '0x3c2269811836af69497E5F486A85D7316753cf62';
        default:
            return ''
    }
}

exports.totalSupply = function (network) {
    switch (network){
        case arbitrum:
            return 10000000;
        default:
            return 0;
    }
}

