
const logger = {
    active : false,
    log : function (text) {
        if (logger.active){
            console.log(text);
        }
    },
    warn : function (text) {
        if (logger.active){
            console.warn(text);
        }
    },
    error : function (text) {
        if (logger.active){
            console.error(text);
        }
    }
};
