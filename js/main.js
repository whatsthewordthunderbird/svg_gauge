/*jslint browser: true, devel: true, regexp: true, plusplus: true, white: true */
/*global jQuery, Gauge */

//gridster
jQuery(function ($) {
  'use strict';
  var
    height = 274 * 0.5;
  $('.gridster ul').gridster({
    autogenerate_stylesheet: true,
    max_cols: 3,
    min_cols: 3,
    resize: {
      enabled: true
    },
    widget_base_dimensions: ['auto', height],
    widget_margins: [20, 20]
  });
});

//gauges
jQuery(function ($) {
  'use strict';
  var
    //formatting functions
    num_format = function (n, opts) {
      var
        def = {
          decimals: 0, err: '-', force_decimals: true,
          negative_parenthesis: false, prefix: '', sign_before_prefix: false
        },
        parts, negative, ret;
      opts = $.extend(def, opts);
      if (typeof n !== 'number') { n = parseFloat(n); }
      if (!isFinite(n)) { return opts.err; }
      negative = n < 0;
      n = Math.abs(n).toFixed(opts.decimals);
      parts = n.split(/\./);
      if (!opts.force_decimals && (!parts[1] || parts[1].match(/^0+$/))) { parts[1] = ''; }
      ret = (negative ? ('-' + (opts.negative_parenthesis ? '(' : '')) : '');
      ret = opts.sign_before_prefix ? (ret + opts.prefix) : (opts.prefix + ret);
      ret += parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
        (parts[1] ? '.' + parts[1] : '') +
        (negative && opts.negative_parenthesis ? ')' : '');
      return ret;
    },
    val_to_time = function (v, opts) {
      v = parseFloat(v) || 0;
      var
        def = {force_hour: false},
        is_negative = v < 0,
        h, m, s;
      opts = $.extend(def, opts || {});
      v = Math.abs(v);
      h = Math.floor(v / 3600);
      m = String(Math.floor(v / 60));
      s = String(Math.round(v % 60));
      if (h || opts.force_hour) {
        h = String(h);
        if (h.length === 1) { h = '0' + h; }
      }
      if (m.length === 1) { m = '0' + m; }
      if (s.length === 1) { s = '0' + s; }
      return ((is_negative ? '-' : '') + (h ? (h + ':') : '') + m + ':' + s);
    },
    //init gauges
    gauge_d_1 = new Gauge(document.getElementById('gauge_d_1'), {
      breakpoints: [5, 16, 30, 38],
      colorSegments: [
        'rgb(13, 78, 152)',
        'rgb(151, 201, 60)',
        'rgb(240, 206, 20)',
        'rgb(241, 102, 34)',
        'rgb(223, 31, 38)'
      ],
      maxValue: 59,
      minValue: 0,
      title: 'Abandons',
      titleHover: 'Abandons hover',
      unit: 'Calls',
      value: 7
    }),
    gauge_d_2 = new Gauge($('#gauge_d_2'), {
      breakpoints: [150, 300],
      colorSegments: [
        'rgb(151, 201, 60)',
        'rgb(240, 206, 20)',
        'rgb(223, 31, 38)'
      ],
      maxValue: 510,
      minValue: 0,
      title: 'MaxQueueTime',
      titleHover: 'MaxQueueTime hover text',
      unit: 'Min:Sec',
      value: 166,
      valueFormat: function (v) { return val_to_time(v); }
    }),
    gauge_d_3 = new Gauge(document.getElementById('gauge_d_3'), {
      breakpoints: [5, 30, 70, 90],
      colorSegments: [
        'rgb(13, 78, 152)',
        'rgb(151, 201, 60)',
        'rgb(240, 206, 20)',
        'rgb(241, 102, 34)',
        'rgb(223, 31, 38)'
      ],
      maxValue: 139,
      minValue: 0,
      title: 'ASA',
      unit: 'Min:Sec',
      value: 29,
      valueFormat: function (v) { return val_to_time(v); }
    }),
    gauge_u_1 = new Gauge($('#gauge_u_1'), {
      breakpoints: [48, 66, 82, 100],
      colorSegments: [
        'rgb(223, 31, 38)',
        'rgb(241, 102, 34)',
        'rgb(240, 206, 20)',
        'rgb(151, 201, 60)',
        'rgb(13, 78, 152)'
      ],
      direction: 0,
      maxValue: 110,
      minValue: 0,
      title: 'CSAT',
      titleHover: 'Customer Satisfaction',
      unit: 'Score',
      value: 92,
      valueFormat: function (v) { return (Math.round(v) + '%'); }
    }),
    gauge_u_2 = new Gauge(document.getElementById('gauge_u_2'), {
      breakpoints: [80, 123, 200, 250],
      colorSegments: [
        'rgb(223, 31, 38)',
        'rgb(241, 102, 34)',
        'rgb(240, 206, 20)',
        'rgb(151, 201, 60)',
        'rgb(13, 78, 152)'
      ],
      direction: 0,
      maxValue: 265,
      minValue: 0,
      title: 'DailySalesGoal',
      titleHover: 'DailySalesGoal hover',
      unit: 'Sales',
      value: 76
    }),
    gauge_u_3 = new Gauge($('#gauge_u_3'), {
      breakpoints: [12, 25],
      colorSegments: [
        'rgb(223, 31, 38)',
        'rgb(240, 206, 20)',
        'rgb(151, 201, 60)'
      ],
      direction: 0,
      maxValue: 34,
      minValue: 0,
      title: 'Retainment',
      unit: 'Customers',
      value: 12
    }),
    gauge_s_1 = new Gauge(document.getElementById('gauge_s_1'), {
      breakpoints: [30, 56, 146, 186],
      colorSegments: [
        'rgb(223, 31, 38)',
        'rgb(240, 206, 20)',
        'rgb(151, 201, 60)'
      ],
      direction: 2,
      maxValue: 216,
      minValue: 0,
      title: 'AHT',
      titleHover: 'Average Handle Time',
      unit: 'Min:Sec',
      value: 105,
      valueFormat: function (v) { return val_to_time(v); }
    }),
    gauge_s_2 = new Gauge(document.getElementById('gauge_s_2'), {
      breakpoints: [30, 56, 146, 186],
      colorSegments: [
        'rgb(223, 31, 38)',
        'rgb(240, 206, 20)',
        'rgb(151, 201, 60)'
      ],
      direction: 2,
      maxValue: 216,
      minValue: 0,
      title: 'AHT',
      titleHover: 'Average Handle Time',
      unit: 'Hr:Min:Sec',
      value: 105,
      valueFormat: function (v) { return val_to_time(v, {force_hour: true}); }
    }),
    gauge_s_3 = new Gauge(document.getElementById('gauge_s_3'), {
      breakpoints: [375000, 750000, 1125000, 1500000],
      colorSegments: [
        'rgb(223, 31, 38)',
        'rgb(240, 206, 20)',
        'rgb(151, 201, 60)'
      ],
      direction: 2,
      maxValue: 1875000,
      minValue: 0,
      title: 'title',
      titleHover: 'titleHover',
      unit: 'Revenue',
      value: 999999.99,
      valueFormat: function (v) {
        var
          is_million = v >= 1000000,
          ret;
        if (is_million) { v /= 1000000; }
        ret = num_format(v, {decimals: 2, prefix: '$'});
        if (is_million) { ret += 'M'; }
        return ret;
      }
    }),
    gauge_with_error = new Gauge();

    //error check
    if (gauge_d_1.error) { console.log('Gauge d_1 error: ' + gauge_d_1.error); }
    if (gauge_d_2.error) { console.log('Gauge d_2 error: ' + gauge_d_2.error); }
    if (gauge_d_3.error) { console.log('Gauge d_3 error: ' + gauge_d_3.error); }
    if (gauge_u_1.error) { console.log('Gauge u_1 error: ' + gauge_u_1.error); }
    if (gauge_u_2.error) { console.log('Gauge u_2 error: ' + gauge_u_2.error); }
    if (gauge_u_3.error) { console.log('Gauge u_3 error: ' + gauge_u_3.error); }
    if (gauge_s_1.error) { console.log('Gauge s_1 error: ' + gauge_s_1.error); }
    if (gauge_s_2.error) { console.log('Gauge s_2 error: ' + gauge_s_2.error); }
    if (gauge_s_3.error) { console.log('Gauge s_3 error: ' + gauge_s_3.error); }
    if (gauge_with_error.error) { console.log('Gauge with_error error: ' + gauge_with_error.error); }

    //randomize every gauge value every x seconds
    setInterval(function () {
      var
        all_gauges = [
          gauge_d_1, gauge_d_2, gauge_d_3,
          gauge_u_1, gauge_u_2, gauge_u_3,
          gauge_s_1, gauge_s_2, gauge_s_3
        ];
      all_gauges.forEach(function (gauge) {
        var
          low = gauge.opts.minValue,
          high = gauge.opts.maxValue,
          rand = Math.floor(Math.random() * (high - low + 1)) + low;
        gauge.setValue(rand);
      });
    }, 5000);
});