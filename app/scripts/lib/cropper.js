/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

define([
],
function () {
  var DEFAULT_DISPLAY_LENGTH = 240;
  var DEFAULT_EXPORT_LENGTH = 480;

  /*
   * options: {
   *  container: The jQuery UI object of the cropper's container element. Required.
   *  src: The image source. Data URIs are okay.
   *  width: The image width. Required if src is set.
   *  height: The image height. Required if src is set.
   *  displayLength: The length of the crop square during cropping
   *  exportLength: The length of the final cropped image
   * }
   */
  function Cropper (options) {
    this.displayLength = options.displayLength || DEFAULT_DISPLAY_LENGTH;
    this.exportLength = options.exportLength || DEFAULT_EXPORT_LENGTH;

    this.top = 0;
    this.left = 0;
    this.yCenter = 0;
    this.xCenter = 0;
    this.rotation = 0;

    if (! options.container) {
      throw new Error('A container element is required');
    }
    this._setupElements(options.container);

    if (options.src) {
      this.setImageSrc(options.src, options.width, options.height);
    }
  }

  Cropper.prototype._setupElements = function (container) {
    var self = this;

    this.container = container;
    this.img = container.find('img');
    this.wrapper = container.find('.wrapper');
    this.canvas = container.find('canvas')[0];

    this.draggable = container.find('.drag-overlay');
    this.draggable.draggable({
      drag: function (e, ui) {
        var pos = self.getBoundedPosition(
          self.top + ui.position.top,
          self.left + ui.position.left
        );
        self.img.css(self.elementPosition(pos));
      },
      stop: function (e, ui) {
        var pos = self.getBoundedPosition(
          self.top + ui.position.top,
          self.left + ui.position.left
        );
        self.updatePosition(pos);
        ui.helper.css({ top: 0, left: 0 });
      }
    });

    this.slider = container.find('[type=range]');
    this.slider.on('input', function (e) {
      self.resize(parseInt(this.value, 10));
    });
    this.scale = parseInt(this.slider.val() || 0, 10);

    this.rotator = container.find('.rotate');
    this.rotator.on('click', function () {
      self.rotate(self.rotation + 90);
    });

    container.find('.zoom-out').on('click', function () {
      self.resize(self.scale - 10);
      self.slider.val(self.scale);
    });

    container.find('.zoom-in').on('click', function () {
      self.resize(self.scale + 10);
      self.slider.val(self.scale);
    });

    // Cache some invariants
    this._wrapperHeight = this.wrapper.height();
    this._wrapperWidth = this.wrapper.width();
    this._wrapperYCenter = this._wrapperHeight / 2;
    this._wrapperXCenter = this._wrapperWidth / 2;
  };

  Cropper.prototype.updatePosition = function (pos) {
      this.yCenter = pos.top + this.boundsHeight() / 2;
      this.xCenter = pos.left + this.boundsWidth() / 2;

      this.top = pos.top;
      this.left = pos.left;
  };

  Cropper.prototype.setImageSrc = function (src, width, height) {
    var img = this.img;

    this.src = src;

    // reset the image position and dimensions
    img.css({
      width: '',
      height: '',
      top: 0,
      left: 0
    });

    this.slider.val(this.scale);

    img.attr('src', this.src);

    // initialize the center to the middle of the wrapper
    this.yCenter = this._wrapperHeight / 2;
    this.xCenter = this._wrapperWidth / 2;

    if (typeof width !== 'number' || typeof height !== 'number' ||
        width <= 0 || height <= 0) {
      throw new Error('Height and width must be > 0.');
    }

    this._originalWidth = width;
    this._originalHeight = height;

    this.isLandscape = this._originalHeight < this._originalWidth;

    this.resize(this.scale);
  };

  Cropper.prototype._dimensionsSwapped = function () {
    return this.rotation % 180 !== 0;
  };

  Cropper.prototype.updateSize = function (length) {
    this.img.height(this.elementHeight());
    this.img.width(this.elementWidth());
  };

  Cropper.prototype._length = function () {
    return this.displayLength * (1 + this.scale / 100);
  };

  // This will scale distances to distances
  Cropper.prototype._exportScale = function () {
    return (1 + this.scale / 100) * this.isLandscape ?
                  this._originalHeight / this.displayLength :
                  this._originalWidth / this.displayLength;
  };

  Cropper.prototype.elementWidth = function () {
    var length = this._length();
    return this.isLandscape ?
              length * this._originalWidth / this._originalHeight :
              length;
  };

  Cropper.prototype.elementHeight = function () {
    var length = this._length();
    return this.isLandscape ?
              length :
              length * this._originalHeight / this._originalWidth;
  };

  Cropper.prototype.boundsWidth = function () {
    return this._dimensionsSwapped() ?
              this.elementHeight() :
              this.elementWidth();
  };

  Cropper.prototype.boundsHeight = function () {
    return this._dimensionsSwapped() ?
              this.elementWidth() :
              this.elementHeight();
  };

  Cropper.prototype.exportLength = function () {
    return this._dimensionsSwapped() ?
              this.elementHeight() :
              this.elementWidth();
  };

  Cropper.prototype.elementPosition = function (pos) {
    if (this._dimensionsSwapped()) {
      pos.top += this._originOffset.top - this._originOffset.left;
      pos.left += this._originOffset.left - this._originOffset.top;
    }
    return pos;
  };

  Cropper.prototype.getBoundedPosition = function (top, left) {
    var w = this.boundsWidth();
    var h = this.boundsHeight();

    var wh = this._wrapperHeight;
    var ww = this._wrapperWidth;

    // keep the left edge of the image within the crop zone
    if (left > 0) {
      left = 0;
    }

    // keep the right edge of the image within the crop zone
    if (left + w < ww) {
      left =  ww - w;
    }

    // keep the top edge of the image within the crop zone
    if (top > 0) {
      top = 0;
    }

    // keep the bottom edge of the image within the crop zone
    if (top + h < wh) {
      top = wh - h;
    }

    return { top: top, left: left };
  };

  Cropper.prototype.resize = function resize(scale) {
    if (scale < 0) {
      scale = 0;
    }
    if (scale > 100) {
      scale = 100;
    }

    var factor = 1 + scale / 100;
    var length = this.displayLength * factor;
    this.scale = scale;

    this.updateSize(length);

    var pos = this.getBoundedPosition(this.yCenter - this.boundsHeight() / 2, this.xCenter - this.boundsWidth() / 2);

    if (this._dimensionsSwapped()) {
      this._originOffset = {
        top: this._wrapperYCenter - this.elementHeight() / 2,
        left: this._wrapperXCenter - this.elementWidth() / 2
      };
    }

    this.updatePosition(pos);
    this.img.css(this.elementPosition(pos));
  };

  // Return new image data for the image rotated by a number of degrees
  Cropper.prototype.rotate = function (degrees) {
    if (degrees % 90) {
      throw new Error('Rotation must be by 90 degree increments');
    }
    degrees = degrees % 360;
    this.img.removeClass('rotate-to-' + this.rotation).addClass('rotate-to-' + degrees);
    this.rotation = degrees;

    // initialize the center to the middle of the wrapper
    this.yCenter = this._wrapperYCenter;
    this.xCenter = this._wrapperXCenter;

    this.resize(this.scale);
  };

  // Get the scaled position of the crop square over the source image
  Cropper.prototype.cropPosition = function () {
    var scale = this.isLandscape ?
                  this._originalHeight / this.displayLength :
                  this._originalWidth / this.displayLength;
    var oscale = 1 + this.scale / 100;
    var sourceLength = this.displayLength / oscale * scale;

    var left = (-this.left) / oscale * scale;
    var top = (-this.top) / oscale * scale;

    return {
      left: left,
      top: top,
      length: sourceLength
    };
  };

  Cropper.prototype._getRotatedImage = function () {
    if (! this._dimensionsSwapped()) {
      return this.img[0];
    }

    var canvas = this.canvas;
    var context = canvas.getContext('2d');

    // Switch height and width to fit rotated image
    canvas.width = this._originalHeight;
    canvas.height = this._originalWidth;

    // move to the center of the canvas
    context.translate(canvas.width / 2, canvas.height / 2);

    // rotate the canvas to the specified degrees
    context.rotate(this.rotation * Math.PI / 180);

    // draw the image
    // since the context is rotated, the image will be rotated also
    context.drawImage(this.img[0], -canvas.height / 2, -canvas.width / 2);

    var img = new Image();
    img.src = canvas.toDataURL('image/png');

    return img;
  };

  // Get the final cropped image data
  Cropper.prototype.toDataURL = function (type, quality) {
    var img = this._getRotatedImage();

    var context = this.canvas.getContext('2d');
    var sourcePos = this.cropPosition();
    var destLength = this.exportLength;

    this.canvas.width = destLength;
    this.canvas.height = destLength;

    context.drawImage(
      img,
      sourcePos.left,
      sourcePos.top,
      sourcePos.length,
      sourcePos.length,
      0, 0, destLength, destLength
    );

    return this.canvas.toDataURL(type || 'image/png', quality);
  };

  return Cropper;
});

