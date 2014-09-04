/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


define([
  'chai',
  'jquery',
  '../../mocks/router',
  '../../mocks/canvas',
  'lib/cropper',
  'views/settings/avatar_crop'
],
function (chai, jquery, RouterMock, CanvasMock, Cropper, View) {
  var assert = chai.assert;
  var pngSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQYV2P4DwABAQEAWk1v8QAAAABJRU5ErkJggg==';

  describe('lib/cropper', function () {
    var view, routerMock;

    beforeEach(function () {
      routerMock = new RouterMock();
      view = new View({
        router: routerMock
      });
      view.cropImgSrc = pngSrc;
      view.isUserAuthorized = function () {
        return true;
      };
    });

    afterEach(function () {
      $(view.el).remove();
      view.destroy();
      view = null;
    });

    it('creates a cropper', function () {
      return view.render()
        .then(function () {
          var cropper = new Cropper({
            src: pngSrc,
            width: 1,
            height: 1,
            container: view.$('.cropper')
          });

          assert.equal(cropper.src, pngSrc);
        });
    });

    describe('with a cropper', function () {
      var cropper;

      beforeEach(function () {
        return view.render()
          .then(function () {
            cropper = new Cropper({
              container: view.$('.cropper'),
              displayLength: 240,
              exportLength: 480
            });

            cropper._wrapperHeight = 240;
            cropper._wrapperWidth = 320;

            cropper.canvas = new CanvasMock();
          });
      });

      afterEach(function () {
        cropper = null;
      });

      it('sets image src after', function () {
        cropper.setImageSrc(pngSrc, 100, 100);

        assert.equal(cropper.yCenter, 120);
        assert.equal(cropper.xCenter, 200);
        assert.equal(cropper.isLandscape, false);
        assert.equal(cropper._originalWidth, 100);
        assert.equal(cropper._originalHeight, 100);
        assert.equal(cropper.elementHeight(), 240);
        assert.equal(cropper.elementWidth(), 240);
      });


      it('rotates and sets landscape mode', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        assert.equal(cropper.isLandscape, true, 'landscape should be true');
        cropper.rotator.trigger('click');
        assert.equal(cropper.isLandscape, false, 'landscape should be false');
      });

      it('change scale with slider', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        cropper.slider.val(50);
        cropper.slider.trigger('input');
        assert.equal(cropper.scale, 50);
      });

      it('zooms in and out', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        cropper.container.find('.zoom-in').trigger('click');
        assert.equal(cropper.scale, 10);

        cropper.container.find('.zoom-out').trigger('click');
        assert.equal(cropper.scale, 0);
      });

      it('sets position', function () {
        cropper.setImageSrc(pngSrc, 100, 50);
        cropper.updatePosition({ top: 25, left: 25 });
        assert.equal(cropper.top, 25);
        assert.equal(cropper.left, 25);
        assert.equal(cropper.yCenter, 145);
        assert.equal(cropper.xCenter, 265);
      });

      it('gets bounded position', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        assert.equal(cropper.getBoundedPosition(0, 50).left, 40,
          'left edge does not exceed gutter length');

        assert.equal(cropper.getBoundedPosition(10, 0).top, 0,
          'top edge does not exceed gutter length');

        assert.equal(cropper.getBoundedPosition(0, -220).left, -200,
          'right edge does not exceed gutter length');

        assert.equal(cropper.getBoundedPosition(-10, 0).top, 0,
          'bottom edge does not exceed gutter length');
      });

      it('resizes', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        cropper.resize(100);
        assert.equal(cropper.scale, 100);
        assert.equal(cropper.elementWidth(), 960);
        assert.equal(cropper.elementHeight(), 480);
      });

      it('calculates crop position of image larger than crop area', function () {
        cropper.setImageSrc(pngSrc, 800, 400);

        var pos = cropper.cropPosition();
        assert.equal(pos.top, 0);
        assert.equal(pos.left,  200);
        assert.equal(pos.length, 400);
      });

      it('calculates crop position of image smaller than crop area', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        var pos = cropper.cropPosition();
        assert.equal(pos.top, 0);
        assert.equal(pos.left,  25);
        assert.equal(pos.length, 50);
      });

      it('gets data url', function () {
        cropper.setImageSrc(pngSrc, 100, 50);

        cropper.toDataURL('image/jpeg', 0.9);
        assert.equal(cropper.canvas._args[0], 'image/jpeg');
        assert.equal(cropper.canvas._args[1], 0.9);
        assert.equal(cropper.canvas._context._args[1], 25);
        assert.equal(cropper.canvas._context._args[2], 0);
        assert.equal(cropper.canvas._context._args[3], 50);
        assert.equal(cropper.canvas._context._args[4], 50);
        assert.equal(cropper.canvas._context._args[7], 480);
        assert.equal(cropper.canvas._context._args[8], 480);
      });
    });
  });
});
