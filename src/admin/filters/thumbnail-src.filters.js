/**
 * thumbnailSrc Filters
 * 缩略图转 SRC
 */
angular.module('filters').filter('thumbnailSrc', function () {
  var url = 'http://video-sinavr.oss-cn-beijing.aliyuncs.com/';
  return function (thumbnail) {
    if (thumbnail) {
      return url + thumbnail.fileOssName;
    } else {
      return;
    }
  }
});