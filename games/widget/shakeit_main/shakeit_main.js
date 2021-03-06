'use strict';

/**
 * @author luckyadam
 * @date 2015-11-2
 * @desc 摇摇乐
 */

PP.define('games/widget/shakeit_main', function (require, exports, module) {

  var AudioPlayer = require('gb/widget/audio_player');
  var Toast = require('toast');
  var lotteryUtil = require('gb/widget/lottery');
  var LotteryDialog = require('gb/widget/lottery_dialog');
  var ShakeitMain = _.Class.extend({
    construct: function (opts) {
      this.conf = $.extend({
        $el: null
      }, opts);
      _.eventCenter.on('shake_game_init', $.proxy(this.init, this));
    },

    init: function (args) {
      this.listenEvent();
      this.initEvent();
      this.isFirstShake = true;
      this.isShaking = false;
      this.isEnd = false;
      this.$falls = this.conf.$el.find('.sm_ribbons').children();
      this.token = args.token;
      this.actId = args.actId;
      this.lotteryDialog = new LotteryDialog();
      this.bgPlayer = new AudioPlayer({
        src: __uri('../images/shake_bg.wav'),
        autoplay: false,
        loop: false,
        type: 'audio/wav'
      });
    },

    initEvent: function () {
      $(window).on('shake', $.proxy(this.shakeEventDidOccur, this))
        .on('unshake', $.proxy(this.unShakeEventDidOccur, this));
    },

    listenEvent: function () {
      _.eventCenter.on('games_widget_shakeit_guide:start', $.proxy(this.onReady, this));
      _.eventCenter.on('gb_widget_countdown2:timeisup', $.proxy(this.onStart, this));
      _.eventCenter.on('gb_widget_countdown:timeisup', $.proxy(this.onTimeisup, this));
      _.eventCenter.on('gb_widget_countdown:start', $.proxy(this.onCountdownStart, this));
      _.eventCenter.on('gb_widget_countdown:timedown', $.proxy(function (time) {
        time = parseInt(time, 10);
        if (time === this.randomTime) {
          if (this.isShaking) {
            this.fallLittleP();
          }
        }

        if (time === 1) {
          lotteryUtil.play({
            token: this.token,
            actId: this.actId
          }, $.proxy(function (ret) {
            this.isWinner = 'unknow';
            if (!ret) {
              return;
            }
            var retData = ret.data;
            this.gift = {};

            switch (ret.code) {
              case "000"://活动已经结束!
              case "001":
                break;
              case "111"://111次数不足
              case "112"://112积分不足
                this.isWinner = 'limit';
                if(retData.limit){
                  var leftShareTimes = 0;
                  if(!isNaN(retData.limit.share_dateMax) && !isNaN(retData.limit.share_date)){
                    leftShareTimes = retData.limit.share_dateMax - retData.limit.share_date;
                    if(leftShareTimes > 0){//提示可以分享获得
                      new Toast({
                        content: '请分享后刷新页面再试',
                        duration: 5000
                      });
                    } else {//分享机会也用完
                      new Toast({
                        content: '今日次数已经用完，请明日再来！',
                        duration: 5000
                      });
                    }
                  }
                }
                break;
              case '399': //领奖失败
                this.isWinner = false;
                break;
              case '300':
                if(retData && retData.sysGift && retData.sysGift.giftType === 1) { //实物奖励
                  this.isWinner = false;
                } else if(retData && retData.sysGift && retData.sysGift.giftType === 2) { //优惠券奖励
                  if(retData.sysGift.giftValue && retData.sysGift.giftName){
                    this.gift.value = retData.sysGift.giftValue;
                    this.gift.name = retData.sysGift.giftName;
                    this.gift.tip = retData.sysGift.sysGiftCode;
                    this.gift.url = retData.sysGift.coupon;
                    this.isWinner = true;
                  }else{
                    new Toast("网络错误，请刷新重试");
                  }

                } else {
                  this.isWinner = false;
                }
                break;
              default:
                break;
            }
            if (this.isEnd) {
              _.eventCenter.trigger('gb_widget_countdown:timeisup');
            }
          }, this));
        }
      }, this));
    },

    onReady: function () {
      $('body').css({
        'transform': 'rotate(-180deg)',
        '-webkit-transform': 'rotate(-180deg)'
      });
      this.conf.$el.show();
      this.randomTime = Math.floor(Math.random() * 8 + 3);
      setTimeout(function () {
        _.eventCenter.trigger('gb_widget_countdown2:start');
      }, 500);
    },

    onStart: function () {
      setTimeout($.proxy(function () {
        this.shakeEvent = new Shake({
          threshold: 8,
          timeout: 500
        });

        this.shakeEvent.start();
      }, this), 600);

    },

    onCountdownStart: function () {
      this.conf.$el.addClass('shake_notice');
    },

    shakeEventDidOccur: function (e) {
      this.bgPlayer.play();
      if (this.isFirstShake) {
        _.eventCenter.trigger('gb_widget_countdown:start');
        this.conf.$el.removeClass('shake_ini').addClass('shake_ing');
        this.conf.$el.find('.countdown2').hide();
        this.isFirstShake = false;
      }
      this.falling();

      this.isShaking = true;
      this.conf.$el.removeClass('shake_notice');
    },

    unShakeEventDidOccur: function () {
      this.bgPlayer.stop();
      if (!this.isEnd) {
        this.conf.$el.addClass('shake_notice');
        this.unfalling();
        this.isShaking = false;
      }
    },

    fallLittleP: function () {
      this.conf.$el.addClass('shake_drop').find('.sm_drop').addClass('falling');
      this.littlePDropped();
    },

    littlePDropped: function () {
      var fallLittlePPlayer = new AudioPlayer({
        src: __uri('../images/shake_little_p.mp3'),
        autoplay: false,
        loop: false
      });
      fallLittlePPlayer.play();
    },

    falling: function () {
      this.$falls.addClass('falling');
    },
    unfalling: function () {
      this.$falls.removeClass('falling');
    },

    onTimeisup: function () {
      var timeUpAudio = new AudioPlayer({
        autoplay: false,
        loop: false
      });

      this.isEnd = true;
      if (this.isWinner !== undefined) {
        this.shakeEvent.stop();
        $(window).off('shake unshake');
        if (this.isWinner === 'limit') {
          return;
        }
        if (this.isWinner === 'unknow') {
          new Toast({
            content: '网络错误，请重新再试！'
          });
          return;
        }
        if (this.isWinner) {
          timeUpAudio.setSrc(__uri('../images/shake_win.mp3'));
          timeUpAudio.play();
          this.conf.$el.removeClass('shake_drop shake_fart shake_notice').addClass('shake_win').find('.sm_drop').addClass('falling');
          setTimeout($.proxy(function () {
            var gift = this.gift;
            this.lotteryDialog.win(gift.value, gift.name, gift.tip, gift.url);
            timeUpAudio.setSrc(__uri('../images/get_gift.mp3'));
            timeUpAudio.play();
          }, this), 1500);
        } else {
          timeUpAudio.setSrc(__uri('../images/shake_fart.mp3'));
          timeUpAudio.play();
          this.conf.$el.removeClass('shake_drop shake_win shake_notice').addClass('shake_fart').find('.sm_drop').addClass('falling');
          setTimeout($.proxy(function () {
            this.lotteryDialog.lose();
          }, this), 1500);
        }
      }
    }
  });

  module.exports = ShakeitMain;

});
