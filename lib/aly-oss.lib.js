/**
 * Created by zdz on 2016/11/1.
 * email: zhang-dezhi@foxmail.com
 * 阿里云OSS服务
 */

var extensions = require('../config/extensions.config');
var AlyConfig = extensions.ALYService[0];
var ALYMobile = extensions.ALYMobile[0];
var tmpPath = extensions.tmp;
var OSS = require('ali-oss').Wrapper;
var ALY = require("aliyun-sdk");
//服务器端
var client = new OSS({
    region: AlyConfig.region,
    accessKeyId: AlyConfig.accessKeyId,
    accessKeySecret: AlyConfig.accessKeySecret,
    bucket: AlyConfig.bucket
});

//服务器端请求临时上传 ID Key

module.exports = {
    //分片上传 异步
    multipartUpload:function(fileName,filePath,callback){

        if((typeof fileName === 'undefined') || (typeof filePath === 'undefined')){
            return callback({code:1,mes:'文件名或文件路径不能为空',data:null});
        }

        var fileOssName = this.fileName(fileName);

        client.multipartUpload(fileOssName, filePath).then(function (result) {

              if(result.res.status != 200){
                  return callback({code:1,mes:'请重新上传',data:null});
              }else {
                  var requestUrls = result.res.requestUrls.toString().split('?')[0];
                  var field = {
                                fileName    : fileName,
                      fileossName: fileOssName,
                      fileUrl: requestUrls,
                  };
                  return   callback({code:0,mes:'',data:field}) ;
              }
        });
    },

    //文件列表
    list:function(search,callback){
        var results = {};
        if(typeof search === 'undefined'){
            results =  client.list();
        }else{
            results =  client.list({prefix: 'noderCms/' + search});
        }
        return callback({err:0,mes:'',data:results});
    },
    //批量删除
    deleteMulti:function(files, callback){
        if(typeof search === 'undefined'){
            return callback({code:1,mes:'文件名不能为空',data:null});
        }
        client.deleteMulti([files],function(v){
            // code ..
        });
        return callback({err:0,mes:'',data:results});
    },
    //文件名拼装
    fileName:function(fileName){
        if(typeof fileName === 'undefined'){
            return {code:1,mes:'文件名不能为空',data:null};
        }
        var date = new Date();
        var name = 'noderCms/' + date.getFullYear()+ '' + (date.getMonth()+1) + date.getDate() + '/'+fileName;
        return name;
    },
    //文件后缀名检查
    checkedSuffix:function(){

    },
    //视频文件转换
    videoConversion:function(){

    },
    //获取视频文件截图

    //删除tmp下指定文件 tmpPath

    //获取阿里云SDK
    getAlySdk:function(callback){
        var sts = new ALY.STS({
            accessKeyId:        ALYMobile.accessKeyId,
            secretAccessKey:    ALYMobile.secretAccessKey,
            endpoint:           ALYMobile.endpoint,
            apiVersion:         ALYMobile.apiVersion
        });
        sts.assumeRole({
                        Action: 'AssumeRole',
                        RoleArn: 'acs:ram::1703440404223394:role/role-oss-upload',
                        Policy: '{"Version":"1","Statement":[{"Effect":"Allow", "Action":["oss:PutObject"], "Resource":"*"}]}',
                        DurationSeconds: 3600,
                        RoleSessionName: 'GameCircle'
                    }, function (err, res) {
                        var credentials ={
                                'AccessKeySecret':  res.Credentials.AccessKeySecret,
                                'AccessKeyId':      res.Credentials.AccessKeyId,
                                'Expiration':       res.Credentials.Expiration,
                                'SecurityToken':    res.Credentials.SecurityToken
                            };
            return callback(credentials);
        });

    },


    };