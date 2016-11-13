var async = require('async');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var logger = require('../../lib/logger.lib');
var moment = require('moment');
var formidable = require('formidable');
var mediaModel = require('../models/media.model');
var contentsModel = require('../models/contents.model');
var featuresModel = require('../models/features.model');
var categoriesModel = require('../models/categories.model');
var Canvas = require('canvas');
var Image = Canvas.Image;
var alyOss = require('../../lib/aly-oss.lib.js');
var cdnUrl = require('../../config/extensions.config').cdnUrl;
/**
 * 查询媒体
 * @param {Object} options
 *        {Object} options.query
 * @param {Function} callback
 */
exports.query = function (options, callback) {
  if (!options.query) {
    var err = {
      type: 'system',
      error: '没有 query 传入'
    };

    return callback(err);
  }

  var query = options.query;

  mediaModel.find(query)
    .select('fileName description date size quotes src')
    .exec(function (err, media) {
      if (err) {
        err.type = 'database';
        return callback(err);
      }

      media = _.map(media, function (medium) {
        var src = medium.src;

        medium = medium.toObject();
        medium.src = src;

        return medium;
      });

      callback(null, media);
    });
};

/**
 * 媒体列表
 * @param {Object} options
 *        {Number} options.currentPage
 *        {Number} options.pageSize
 * @param {Function} callback
 */
exports.list = function (options, callback) {
  var currentPage = 1;
  var pageSize = 50;

  if (options.currentPage) currentPage = parseInt(options.currentPage);
  if (options.pageSize) pageSize = parseInt(options.pageSize);

  async.waterfall([
    function (callback) {
      mediaModel.count({}, function (err, count) {
        if (err) return callback(err);

        if (count) {
          callback(null, count);
        } else {
          callback(null, null);
        }
      });
    },
    function (count, callback) {
      mediaModel.find({'isDelete':1})
        .sort('-date')
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .select('fileName description date size quotes src fileOssName')
        .exec(function (err, media) {
          if (err) {
            err.type = 'database'
            return callback(err);
          }
          media = _.map(media, function (medium) {
            var src = cdnUrl + medium.fileOssName;
            medium = medium.toObject();
            medium.src = src;

            return medium;
          });
          callback(null, count, media);
        });
    }
  ], function (err, count, media) {
    var result = {
      media: media,
      pages: Math.ceil(count / pageSize)
    };

    callback(err, result);
  });
};

/**
 * 存储媒体
 * @param {Object} options
 *        {MongoId} options._id
 *        {Object} options.data
 *        {Object} options.req
 * @param {Function} callback
 */
exports.save = function (options, callback) {
  if (options._id && !options.data) {
    var err = {
      type: 'system',
      error: '没有 data 传入'
    };

    return callback(err);
  }

  if (!options._id && !options.req) {
    var err = {
      type: 'system',
      error: '没有 req 传入'
    };

    return callback(err);
  }

  var req = options.req;

  if (options._id) {
    var data = options.data;
    var _id = options._id;

    async.waterfall([
      function (callback) {
        mediaModel.findByIdAndUpdate({ _id: _id }, data, { runValidators: true }, function (err, oldMedium) {
          if (err) err.type = 'database';

          callback(err, oldMedium);
        });
      }
      // ,
      // function (oldMedium, callback) {
      //   if (data.fileName !== oldMedium.fileName) {
      //     var prePath = '../../public/media/' + moment(oldMedium.date).format('YYYYMM') + '/' + oldMedium._id + '/';
      //     var oldPath = path.join(__dirname, prePath + oldMedium.fileName);
      //     var newPath = path.join(__dirname, prePath + data.fileName);
      //
      //     fs.rename(oldPath, newPath, function (err) {
      //       if (err) err.type = 'system';
      //
      //       callback(err);
      //     });
      //   } else {
      //     callback(null);
      //   }
      // }
    ], callback);
  } else {
    async.auto({
      // 解析传进的文件
      formParse: function (callback) {
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        // form.uploadDir = 'tmp';
        form.keepExtensions = false;
        form.maxFieldsSize = 100 * 1024 * 1024; // 10MB
        form.multiples = false;
        form.parse(req, function (err, fields, data) {
          if (err) {
            err.type = 'system';
            callback(err);
          }

          callback(null, data.file);
        });
      },
      // saveALY: ['formParse', function (callback, results) {
      //   alyOss.multipartUpload(results.formParse.name,results.formParse.path,function(v){
      //     results.formParse.fileossName = v.data.fileossName;
      //     results.formParse.fileUrl = v.data.fileUrl;
      //     callback(null,results);
      //   });
      // }],
      //
      //
      // // 存储进数据库
      // saveModel: ['saveALY', function (callback, results) {
      //   var medium = {
      //     type: results.formParse.type,
      //     fileName: results.formParse.name,
      //     date: results.formParse.lastModifiedDate,
      //     size: results.formParse.size,
      //     fileOssName:results.formParse.fileossName,
      //     fileOssUrl:results.formParse.fileUrl,
      //   };
      //
      //   new mediaModel(medium).save(function (err, medium) {
      //     if (err) err.type = 'database';
      //
      //     callback(err, medium);
      //   });
      // }],

      // 存储进数据库
      saveModel: ['formParse', function (callback, results) {
        var date = new Date();
        var medium = {
          type: results.formParse.type,
          fileName: results.formParse.name,
          date: results.formParse.lastModifiedDate,
          size: results.formParse.size,
          fileOssName: results.formParse.name,
          fileOssPath: results.formParse.name,
          isDelete:1
        };

        new mediaModel(medium).save(function (err, medium) {
          if (err) err.type = 'database';

          callback(err, medium);
        });
      }],

      // 创建文件夹
      // mkdirFolder: ['saveModel', function (callback, results) {
      //   var folder = '../../public/media/' + moment(results.saveModel.date).format('YYYYMM') + '/' + results.saveModel._id;
      //
      //   mkdirp(path.join(__dirname, folder), function (err) {
      //     if (err) err.type = 'system';
      //
      //     callback(null, folder);
      //   });
      // }],
      // // 移动文件或者压缩图片并移动文件
      // moveFileOrCompressImage: ['formParse', 'saveModel', 'mkdirFolder', function (callback, results) {
      //   var regex = /^image\/(jpeg|png)$/;
      //   var isJpgAndPng = regex.test(results.saveModel.type);
      //
      //   if (isJpgAndPng) {
      //     var aftName = _.get(results.saveModel.type.match(regex), '[1]');
      //
      //     async.waterfall([
      //       function (callback) {
      //         fs.readFile(path.join(__dirname, '../../' + results.formParse.path), function (err, file) {
      //           if (!file) {
      //             var err = {
      //               type: 'system',
      //               error: '没有找到' + path.join(__dirname, '../../' + results.formParse.path)
      //             };
      //             return callback(err);
      //           }
      //
      //           callback(null, file);
      //         });
      //       },
      //       function (file, callback) {
      //         var image = new Image;
      //         image.src = file;
      //
      //         var width = image.width;
      //         var height = image.height;
      //
      //         var canvas = new Canvas(width, height);
      //         var ctx = canvas.getContext('2d');
      //         ctx.drawImage(image, 0, 0, width, height);
      //
      //         var out = fs.createWriteStream(path.join(__dirname, results.mkdirFolder + '/' + results.saveModel.fileName));
      //
      //         var stream;
      //
      //         switch (aftName) {
      //           case 'jpg':
      //           case 'jpeg':
      //             stream = canvas.jpegStream();
      //             break;
      //           case 'png':
      //             stream = canvas.pngStream();
      //         }
      //
      //         stream.on('data', function (chunk) {
      //           out.write(chunk);
      //         });
      //         stream.on('end', function () {
      //           callback();
      //         });
      //       },
      //       function (callback) {
      //         fs.unlink(path.join(__dirname, '../../' + results.formParse.path), function (err) {
      //           callback(err);
      //         });
      //       }
      //     ], function (err) {
      //       if (err) {
      //         err.type = 'system';
      //         return callback(err);
      //       }
      //
      //       callback();
      //     });
      //   } else {
      //     fs.rename(path.join(__dirname, '../../' + results.formParse.path), path.join(__dirname, results.mkdirFolder + '/' + results.saveModel.fileName), function (err) {
      //       if (err) {
      //         err.type = 'system';
      //         return callback(err);
      //       }
      //
      //       callback(null);
      //     });
      //   }
      // }],

    }, function (err, results) {
      if (err) return callback(err);
      var medium = {
        _id: results.saveModel._id,
        // src: results.saveModel.src
        src: results.formParse.fileUrl,
      };

      callback(null, medium);
    });
  }
};

/**
 * 删除媒体
 * @param {Object} options
 *        {MongoId} options._id
 * @param {Function} callback
 */
exports.remove = function (options, callback) {
  if (!options._id) {
    var err = {
      type: 'system',
      error: '没有 _id 传入'
    };

    return callback(err);
  }

  var _id = options._id;

  mediaModel
    .findById(_id)
    .lean()
    .exec(function (err, medium) {
      if (!medium) return callback();

      async.auto({
        pullQuotes: function (callback) {
          async.parallel([
            // 删除内容中的媒体引用
            function (callback) {
              contentsModel.update({ media: _id }, { $pull: { media: _id } }, {
                multi: true, runValidators: true
              }, callback);
            },
            // 删除内容中的缩略图引用
            function (callback) {
              contentsModel.update({ thumbnail: _id }, { $unset: { thumbnail: true } }, {
                multi: true, runValidators: true
              }, callback);
            },
            // 删除单页中的媒体引用
            function (callback) {
              categoriesModel.update({ 'mixed.pageMedia': _id }, { $pull: { 'mixed.media': _id } }, {
                multi: true, runValidators: true
              }, callback);
            },
            // 删除推荐中的媒体引用
            function (callback) {
              featuresModel.update({ media: _id }, { $pull: { media: _id } }, {
                multi: true, runValidators: true
              }, callback);
            },
            // 删除推荐中的缩略图引用
            function (callback) {
              featuresModel.update({ thumbnail: _id }, { $unset: { thumbnail: true } }, {
                multi: true, runValidators: true
              }, callback);
            }
          ], function (err) {
            if (err) err.type = 'database';

            callback(err);
          });
        },
        removeMedium: function (callback) {
          var data = {'isDelete':0};
          mediaModel.findByIdAndUpdate({ _id: _id }, data, { runValidators: true }, function (err, oldMedium) {
            if (err) err.type = 'database';

            callback(err, oldMedium);
          });

        },
        // unlinkFile: ['removeMedium', function (callback, results) {
        //   var fileFolder = '../../public/media/' + moment(results.removeMedium.date).format('YYYYMM') + '/' + results.removeMedium._id;
        //
        //   rimraf(path.join(__dirname, fileFolder), function (err) {
        //     if (err) err.type = 'system';
        //
        //     callback(err);
        //   });
        // }]
      }, function (err) {
        if (err) return callback(err);

        callback();
      });
    });
};

/**
 * 媒体总数
 * @param {Function} callback
 */
exports.total = function (callback) {
  mediaModel.count({}, function (err, count) {
    if (err) {
      err.type = 'database';
      return callback(err);
    }
    callback(null, count);
  });
};

//AliKey
exports.alikey = function(callback){
     alyOss.getAlySdk(function(v){
       return  callback(v);
  });
}