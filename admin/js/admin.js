/*jslint browser: true, devel: true, regexp: true, plusplus: true, white: true */
/*global jQuery, Gauge */

//gauges
jQuery(function ($) {
  'use strict';
  var
    //dom
    $gaugeta_d =  $('#gaugeta_d'),
    $gaugeta_u = $('#gaugeta_u'),
    $gaugeta_s = $('#gaugeta_s'),
    //boxes
    $all_boxes = $('.boxes_cont .box'),
    //init gauges
    gauge_d = new Gauge($('#gauge_d')),
    gauge_u = new Gauge($('#gauge_u')),
    gauge_s = new Gauge($('#gauge_s')),
    //formatting functions
    number_to_val = function (v) {
      //return parseInt(v, 10);
      return parseFloat(v);
    },
    time_to_val = function (time) {
      time = $.trim(String(time));
      var
        i, t,
        is_negative,
        matches = time.match(/\d:\d/);
      if (matches) {
        matches = time.match(/\d{1,}(?::|$)/g);
        if (matches) {
          is_negative = time.match(/^-/);
          matches.reverse();
          time = 0;
          t = Math.min(3, matches.length);
          for (i = 0; i < t; i++) {
            time += (parseFloat(matches[i]) || 0) * Math.pow(60, i);
          }
          if (is_negative) { time = -time; }
        }
      }
      return parseFloat(time);
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
    //
    breakpointsSeparation_def = 1,
    disabled_val = '###',
    base_opts = {
      d: {
        breakpointsSeparation: breakpointsSeparation_def,
        demo: true,
        hover: false,
        hoverInvert: true,
        title: 'Abandons',
        unit: 'Calls',
        direction: 1,
        value: 0,
        valueFormat: function (v, is_arc) {
          if (is_arc) { return Math.round(v); }
          return '##';
        }
      },
      u: {
        breakpointsSeparation: breakpointsSeparation_def,
        demo: true,
        hover: false,
        hoverInvert: true,
        title: 'Retainment',
        unit: 'Customers',
        direction: 0,
        value: 0,
        valueFormat: function (v, is_arc) {
          if (is_arc) { return (Math.round(v) + '%'); }
          return '##%';
        }
      },
      s: {
        breakpointsSeparation: breakpointsSeparation_def,
        demo: true,
        hover: false,
        hoverInvert: true,
        title: 'AHT',
        unit: 'Min:Sec',
        direction: 2,
        value: 0,
        valueFormat: function (v, is_arc) {
          if (is_arc) { return val_to_time(v); }
          return '##:##';
        }
      }
    },
    //
    colors = {
      blue: 'rgb(13, 78, 152)',
      green: 'rgb(151, 201, 60)',
      orange: 'rgb(241, 102, 34)',
      red: 'rgb(223, 31, 38)',
      yellow: 'rgb(240, 206, 20)'
    },
    boxes_colors = {
      d: {
        '0,2,3': [colors.green, colors.yellow, colors.red],
        '0,1,2,3,4': [colors.blue, colors.green, colors.yellow, colors.orange, colors.red],
        '0,2,3,4': [colors.blue, colors.green, colors.yellow, colors.red],
        '0,1,2,3': [colors.green, colors.yellow, colors.orange, colors.red],
        '0,3': [colors.green, colors.red]
      },
      u: {
        '0,2,3': [colors.red, colors.yellow, colors.green],
        '0,1,2,3,4': [colors.red, colors.orange, colors.yellow, colors.green, colors.blue],
        '0,2,3,4': [colors.red, colors.yellow, colors.green, colors.blue],
        '0,1,2,3': [colors.red, colors.orange, colors.yellow, colors.green],
        '0,3': [colors.red, colors.green]
      },
      s: {
        '0,1,2,3,4': [colors.red, colors.yellow, colors.green]
      }
    },
    boxes_sel = [],
    //
    adjust_inputs_after_change = function ($input, $box, skip_current_box) {
      if ($box === undefined) { $box = $input.closest('.box'); }
      var
        is_high1 = $input.hasClass('high'),
        is_time = $input.hasClass('time'),
        parse_val = is_time ? time_to_val : number_to_val,
        out_val = is_time ? val_to_time : String,
        $boxes_cont = $box.closest('.boxes_cont'),
        $boxes = $boxes_cont.find('.box').not('.disabled'),
        box_index = $boxes.index($box),
        type = $boxes_cont.hasClass('boxes_cont_s') ? 's' : (
          $boxes_cont.hasClass('boxes_cont_u') ? 'u' : 'd'
        ),
        bp_sep = breakpointsSeparation_def,
        val_last,
        fix_up = function (finput) {
          var
            $finput = $(finput),
            f_val = parse_val($finput.val()),
            f_val_o = f_val;
          //make higher if needed
          if (f_val - val_last < bp_sep) {
            f_val = val_last + bp_sep;
          }
          //make lower if needed, but only for .low
          else if ($finput.hasClass('low')) {
            if (f_val - val_last > bp_sep) {
              f_val = val_last + bp_sep;
            }
          }
          //update if fixed
          if (f_val_o !== f_val) {
            $finput.val(out_val(f_val)).data({last_val: f_val});
          }
          //
          val_last = f_val;
        },
        fix_down = function (finput) {
          var
            $finput = $(finput),
            f_val = parse_val($finput.val()),
            f_val_o = f_val;
          //make lower if needed
          if (val_last - f_val < bp_sep) {
            f_val = val_last - bp_sep;
          }
          //make higher if needed, but only for .high
          else if ($finput.hasClass('high')) {
            if (val_last - f_val > bp_sep) {
              f_val = val_last - bp_sep;
            }
          }
          //update if fixed
          if (f_val_o !== f_val) {
            $finput.val(out_val(f_val)).data({last_val: f_val});
          }
          //
          val_last = f_val;
        },
        $input_high, $input_low,
        inp_arr,
        val_high, val_low;
      //fix current box inputs
      $input_high = $box.find('input.high');
      $input_low = $box.find('input.low');
      val_high = parse_val($input_high.val());
      val_low = parse_val($input_low.val());
      if (!skip_current_box) {
        //$input_high changed
        if (is_high1) {
          val_last = val_high;
          fix_down($input_low[0]);
          val_low = parse_val($input_low.val());
        }
        //$input_low changed
        else {
          val_last = val_low;
          fix_up($input_high[0]);
          val_high = parse_val($input_high.val());
        }
      }
      //fix boxes up
      inp_arr = [];
      $boxes.slice(0, box_index).each(function () {
        var $cbox = $(this);
        if (type === 'u') {
          inp_arr.unshift($cbox.find('input.high')[0], $cbox.find('input.low')[0]);
        }
        else {
          inp_arr.unshift($cbox.find('input.low')[0], $cbox.find('input.high')[0]);
        }
      });
      val_last = type === 'u' ? val_low : val_high;
      inp_arr.forEach(type === 'u' ? fix_down : fix_up);
      //fix boxes down
      inp_arr = [];
      $boxes.slice(box_index + 1).each(function () {
        var $cbox = $(this);
        if (type === 'u') {
          inp_arr.push($cbox.find('input.low')[0], $cbox.find('input.high')[0]);
        }
        else {
          inp_arr.push($cbox.find('input.high')[0], $cbox.find('input.low')[0]);
        }
      });
      val_last = type === 'u' ? val_high : val_low;
      inp_arr.forEach(type === 'u' ? fix_up : fix_down);
    },
    //
    gauge_update = function ($box) {
      var
        $boxes_cont = $box.closest('.boxes_cont'),
        $boxes = $boxes_cont.find('.box'),
        $gaugeta,
        gauge,
        type,
        tmp,
        opts,
        opts_text,
        ranges,
        num_parse = parseFloat;
      //type
      if ($boxes_cont.hasClass('boxes_cont_d')) {
        $gaugeta = $gaugeta_d;
        gauge = gauge_d;
        type = 'd';
      }
      else if ($boxes_cont.hasClass('boxes_cont_u')) {
        $gaugeta = $gaugeta_u;
        gauge = gauge_u;
        type = 'u';
      }
      else if ($boxes_cont.hasClass('boxes_cont_s')) {
        $gaugeta = $gaugeta_s;
        gauge = gauge_s;
        type = 's';
        num_parse = time_to_val;
      }
      //opts
      opts = $.extend(true, {}, base_opts[type]);
      //get options
      boxes_sel = $.map($boxes, function (el, i) { return ($(el).hasClass('disabled') ? null : i); });
      opts.colorSegments = boxes_colors[type][boxes_sel.join(',')];
      //get values options
      ranges = [];
      boxes_sel.forEach(function (i) {
        ranges.push({
          low: num_parse($boxes.eq(i).find('input.low').val()),
          high: num_parse($boxes.eq(i).find('input.high').val())
        });
      });
      if (type === 'd' || type === 's') { ranges.reverse(); }
      opts.minValue = ranges[0].low;
      opts.maxValue = ranges[ranges.length - 1].high;
      opts.breakpoints = $.map(ranges, function (o, i) {
        if (i < ranges.length - 1) { return o.high; }
      });
      opts.value = opts.minValue;
      //yellow box is required on d/u when 4 and 5 boxes are enabled
      if (type === 'd' || type === 'u') {
        $boxes.eq(2).toggleClass('required', boxes_sel.length > 3);
      }
      //set the options
      try {
        gauge.setOpts(opts);
      }
      catch (err) {
        console.log(opts);
        console.log(err);
        $gaugeta.val(
          gauge.error ? ('Error: ' + gauge.error) :
          'There was an error with these parameters'
        );
        return;
      }
      //clean opts
      delete opts.hover;
      delete opts.hoverInvert;
      delete opts.demo;
      if (opts.breakpointsSeparation === breakpointsSeparation_def) { delete opts.breakpointsSeparation; }
      //sort opts
      tmp = {opts: {}, keys: Object.keys(opts).sort()};
      tmp.keys.forEach(function (key) { tmp.opts[key] = opts[key]; });
      opts = tmp.opts;
      //export opts
      opts_text = JSON.stringify(opts, null, '  ');
      opts_text = opts_text.replace(/breakpoints: \[\]/g, '');
      tmp = {start: opts_text.indexOf('"breakpoints":') + 14 + 1};
      tmp.end = opts_text.indexOf(']', tmp.start) + 1;
      tmp.breakpoints = opts_text.substr(tmp.start, tmp.end - tmp.start)
        .replace(/\s+/g, '').replace(/,/g, ', ');
      opts_text = opts_text.substr(0, tmp.start) + (tmp.breakpoints) + opts_text.substr(tmp.end);
      opts_text = opts_text.replace(/"([^"]+)":/g, '$1:');
      $gaugeta.val(opts_text);
    };

  //save input last_val on focusin & trigger it
  $all_boxes.find('input.low, input.high').on('focusin', function () {
    var
      $input = $(this),
      is_time = $input.hasClass('time'),
      parse_val = is_time ? time_to_val : number_to_val;
    $input.data({last_val: parse_val($input.val())});
  }).trigger('focusin');

  //(re)convert time inputs values to time
  $all_boxes.find('input.time').each(function () {
    var $input = $(this);
    $input.val(val_to_time(time_to_val($input.val())));
  });

  //on change reset input values if incorrect, otherwise check all boxes values and update gauge
  $all_boxes.find('input.low, input.high').on('change', function () {
    var
      $input = $(this),
      $box,
      is_time = $input.hasClass('time'),
      parse_val = is_time ? time_to_val : number_to_val,
      out_val = is_time ? val_to_time : String,
      val, pval;
    val = $input.val();
    pval = parse_val(val);
    //invalid
    if (
      isNaN(pval) ||
      (is_time && val !== out_val(pval) && val !== String(pval)) ||
      (!is_time && val !== out_val(pval))
    ) { $input.val(out_val($input.data('last_val'))); }
    //valid
    else {
      $box = $input.closest('.box');
      $input.val(out_val(pval)).data({last_val: pval});
      adjust_inputs_after_change($input, $box);
      gauge_update($box);
    }
  });

  //toggle on/off
  $all_boxes.on('click', '.on_off', function () {
    var
      $box = $(this).closest('.box'),
      enable = $box.hasClass('disabled'),
      $inputs,
      $adjust_box, $adjust_input;
    $box.toggleClass('disabled', !enable);
    $inputs = $box.find('input').prop({readonly: !enable}).each(function () {
      var $input = $(this);
      $input.val(enable ? $input.data('last_val') : disabled_val);
    });
    //adjust elements
    if (enable) {
      $adjust_box = $box;
      $adjust_input = $inputs.first();
    }
    else {
      $adjust_box = $box.next('.box');
      $adjust_box = $adjust_box.length ? $adjust_box : $box.prev('.box');
      $adjust_input = $adjust_box.find('input').first();
    }
    //adjust and update
    adjust_inputs_after_change($adjust_input, $adjust_box, true);
    gauge_update($box);
  });

  //readonly inputs on disabled boxes
  $all_boxes.filter('.disabled').find('input.low, input.high').val(disabled_val).prop({readonly: true});

  //initial input adjust for disabled boxes
  $('.boxes_cont_d, .boxes_cont_u, .boxes_cont_s').each(function () {
    var
      $box = $(this).find('.box.disabled').first(),
      $adjust_box;
    if (!$box.length) { return; }
    $adjust_box = $box.next('.box');
    $adjust_box = $adjust_box.length ? $adjust_box : $box.prev('.box');
    adjust_inputs_after_change($box.find('input').first(), $adjust_box);
  });

  //trigger 1st change to update gauges
  gauge_update($('.boxes_cont_d .box').first());
  gauge_update($('.boxes_cont_u .box').first());
  gauge_update($('.boxes_cont_s .box').first());

});