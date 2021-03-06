/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


define([
  'mocha',
  'chai',
  'underscore',
  'jquery',
  'views/settings',
  'lib/fxa-client',
  'lib/session',
  '../../mocks/router'
],
function (mocha, chai, _, $, View, FxaClient, Session, RouterMock) {
  var assert = chai.assert;

  describe('views/settings', function () {
    var view, router, email;

    beforeEach(function () {
      Session.clear();
      router = new RouterMock();
      view = new View({
        router: router
      });
    });

    afterEach(function () {
      $(view.el).remove();
      view.destroy();
      view = null;
      router = null;
    });

    describe('with no session', function () {
      it('redirects to signin', function(done) {
        router.on('navigate', function (newPage) {
          assert.equal(newPage, 'signin');
          done();
        });

        var isRendered = view.render();
        assert.isFalse(isRendered);
      });
    });

    describe('with session', function () {
      beforeEach(function (done) {
        email = 'testuser.' + Math.random() + '@testuser.com';

        var client = new FxaClient();
        client.signUp(email, 'password')
          .then(function() {
            view.render();

            $('body').append(view.el);
            done();
          });
      });

      describe('signOut', function () {
        it('signs the user out, redirects to signin page', function (done) {
          router.on('navigate', function (newPage) {
            assert.equal(newPage, 'signin');
            done();
          });

          view.signOut();
        });
      });
    });
  });
});


