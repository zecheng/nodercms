/**
 * ndThumbnail Directives
 * Thumbnail 上传组件
 */
angular.module('directives').directive('ndThumbnail',  ['$templateCache', '$timeout', '$filter', '$http', 'Upload', 'base64ToBlobFile',
  function ($templateCache, $timeout, $filter, $http, Upload, base64ToBlobFile) {
    return {
      restrict: 'E',
      template: $templateCache.get('thumbnail.view.html'),
      scope: {
        thumbnail: '=',
        disabled: '=',
        width: '=',
        height: '='
      },
      link: function (scope, element, attrs, ctrl) {
        'use strict';

        /**
         * 初始化变量
         */
        scope.thumbnail = {
          _id: scope.thumbnail._id || null,
          file: null,
          sourceImage: '',
          croppedImage: scope.thumbnail.croppedImage || '',
          uploadStatus: scope.thumbnail.uploadStatus || 'initial'
        };
        scope.minWidth = scope.width / 2;
        scope.minHeight = scope.height / 2;

        /**
         * 裁剪缩略图
         * @param files 文件名
         */
        scope.cropThumbnail = function (files) {
          if (_.isEmpty(files)) return false;

          scope.thumbnail.file = files[0];

          Upload.dataUrl(scope.thumbnail.file).then(function (url) {
            scope.thumbnail.sourceImage = url;
            $('#corpModal').modal('show');
          });
        };

        /**
         * 关闭裁剪窗后清空 $scope.thumbnail
         */
        $('#corpModal').on('hide.bs.modal', function () {
          if (scope.thumbnail.uploadStatus === 'initial') {
            scope.$apply(function () {
              scope.thumbnail = {
                _id: null,
                file: null,
                sourceImage: '',
                croppedImage: '',
                uploadStatus: 'initial'
              };
            });
          }
        });
        /**
         * 文件MD5
         */
        scope.calculateMD5Hash = function (file, bufferSize) {
          var def = Q.defer();

          var fileReader = new FileReader();
          var fileSlicer = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
          var hashAlgorithm = new SparkMD5();
          var bufferSize = Math.pow(1024, 2) * 1000;
          var totalParts = Math.ceil(file.size / bufferSize);
          var currentPart = 0;
          var startTime = new Date().getTime();

          fileReader.onload = function(e) {
            currentPart += 1;

            def.notify({
              currentPart: currentPart,
              totalParts: totalParts
            });

            var buffer = e.target.result;
            hashAlgorithm.appendBinary(buffer);

            if (currentPart < totalParts) {
              processNextPart();
              return;
            }

            def.resolve({
              hashResult: hashAlgorithm.end(),
              duration: new Date().getTime() - startTime
            });
          };

          fileReader.onerror = function(e) {
            def.reject(e);
          };

          function processNextPart() {
            var start = currentPart * bufferSize;
            var end = Math.min(start + bufferSize, file.size);
            fileReader.readAsBinaryString(fileSlicer.call(file, start, end));
          }
          processNextPart();
          return def.promise;
        };
        /**
         * 上传缩略图
         */
        scope.uploadThumbnail = function () {
          scope.thumbnail.uploadStatus = 'uploading';
          /* 获取文件后缀 */
          var fileNameLast = _.get(scope.thumbnail.file.name.match(/^.+\.(\w+)$/), 1);
          Upload.upload({
            url: '/api/media',
            data: { file: base64ToBlobFile(scope.thumbnail.croppedImage, scope.thumbnail.file.name.replace(/\.\w+$/, '') + '.jpg', 'image/jpeg') }
          }).then(function (res) {

            /* OSS上传 */
            var result_id = res.data._id;
            scope.calculateMD5Hash(scope.thumbnail.file).then(
                function(result) {
                  $.get('/api/aly',function(data){
                    var client = new OSS.Wrapper({
                      region: data.region,
                      accessKeyId: data.AccessKeyId,
                      accessKeySecret: data.AccessKeySecret,
                      stsToken: data.SecurityToken,
                      bucket: data.bucket
                    });
                    scope.thumbnail.file.fileOssName =  result.hashResult+ '.'+fileNameLast;
                    client.multipartUpload(scope.thumbnail.file.fileOssName, scope.thumbnail.file).then(function (res) {
                      var ossUpdate = {fileName:scope.thumbnail.file.name,fileOssName:scope.thumbnail.file.fileOssName,fileOssUrl:scope.thumbnail.file.fileOssName};
                      $.ajax({
                        url: "/api/media/" + result_id,
                        type: 'PUT',
                        data:ossUpdate
                      });
                    });
                  });
                });

            var data = res.data;

            scope.thumbnail.uploadStatus = 'success';

            scope.thumbnail._id = data._id;
          }, function () {
            scope.$emit('notification', {
              type: 'danger',
              message: '缩略图上传失败'
            });
          });

          $('#corpModal').modal('hide');
        };

        /**
         * 删除缩略图
         */
        scope.removeThumbnail = function () {
          scope.thumbnail = {
            _id: null,
            file: null,
            sourceImage: '',
            croppedImage: '',
            uploadStatus: 'initial'
          };
        };
      }
    }
  }
]);