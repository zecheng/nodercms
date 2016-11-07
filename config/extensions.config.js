/**
 * Created by zdz on 2016/10/28.
 * 此配置文件专门配置第三方服务
 */

module.exports = {
    //阿里云STS
    ALYService:[
        {
            region:             process.env.NODE_AS_REGION_ENV,
            accessKeyId:        process.env.NODE_AS_ACCESSKEYID_ENV,
            accessKeySecret:    process.env.NODE_AS_ACCESSKEYSECRET_ENV,
            bucket:             process.env.NODE_AS_BRCKET_ENV
        }],
    ALYMobile:[
        {
            accessKeyId:        process.env.NODE_AM_ACCESSKEYID_ENV,
            secretAccessKey:    process.env.NODE_AM_SECRETACCESSKEY_ENV,
            endpoint:           process.env.NODE_AM_ENDPOINT_ENV,
            apiVersion:         process.env.NODE_AM_APIVERSION_ENV
        }],
    //临时文件地址
    tmp:'/tmp/',
    ossUrl:'http://gamecircle-video.oss-cn-beijing.aliyuncs.com/',
    cdnUrl:'http://video.youka.youmengchuangxiang.com/'
};