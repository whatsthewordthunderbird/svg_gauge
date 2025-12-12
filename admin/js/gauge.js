/*jslint browser: true, devel: true, regexp: true, plusplus: true, white: true */
/*global Snap */

(function () {
  'use strict';
  var
    pcolors = {},
    js_start = new Date(),
    fonts_loaded_or_timeout = {},
    Gauge = function (container, copts) {
      var
        def_opts = {
          //array of breakpoint values
          breakpoints: [12, 50],
          //array of css colors: it will have 1 more item than the breakpoints array
          //null: it will use default colors for 1 to 4 breakpoints
          //when direction is set to 2: 3 colors or null should be used
          colorSegments: null,
          //0=up, 1=down, 2=Sweet Spot Metric
          direction: 1,
          //maximum point on the gauge
          maxValue: 100,
          //minimum point on the gauge
          minValue: 0,
          //text displayed under the gauge
          title: '',
          //text displayed under the gauge (hover), can be set to null to disable hover
          titleHover: null,
          //text displayed directly under the display value
          unit: '',
          //value as number
          value: 0,
          //function to format values, any number in between values can be passed so it should round if needed
          valueFormat: function (v) { return Math.round(v); },

          //durations of animations in milliseconds (0 to disable)
          animDurationArc: 600,
          animDurationArcFirst: 600,
          animDurationHover: 300,
          //size of each arc separation, 'auto' (by breakpointsSeparation) or a specific angle i.e. 2.5
          arcSeparator: 2.5,
          //value corresponding to each arc separation
          breakpointsSeparation: 1,
          //if set to true: hide the gauge marker, skip value animations
          demo: false,
          //change between views on mouse hover
          hover: true,
          //invert default/hover views
          hoverInvert: false,
          //whether to label arc values on the hover view
          labelRanges: true,
          //whether to label arc end value on the hover view
          labelRangesEnd: false,
          //whether to label arc start value on the hover view
          labelRangesStart: false,
          //whether svg should adjust to parent size
          responsive: true
        },
        base_color = {
          blue: 'rgb(13, 78, 152)',
          green: 'rgb(151, 201, 60)',
          orange: 'rgb(241, 102, 34)',
          red: 'rgb(223, 31, 38)',
          yellow: 'rgb(240, 206, 20)'
        },
        that = this,
        opts,
        RAD_DEG = Math.PI / 180.0,
        PI2 = 2 * Math.PI,
        DIRECTION_UP = 0,
        DIRECTION_DOWN = 1,
        DIRECTION_SWEET = 2,

        prev_opts,
        first_draw = true, g_els = {},

        extend_obj,

        mix_colors, get_perc_color, get_pcolor, get_colors_bar,
        text_resize_timed_clear, text_resize_timed, text_resize_timers = {},
        get_title_fsize,
        set_draw_data,
        hover_title_in, hover_title_out,
        hover_view_in, hover_view_out, is_view_hovered,
        point_on_arc, path_pie_sector,
        value_text, size_lbl_val, set_lbl_val, animate_value,

        pos_arc_lbl, draw_arc_lbl, list_arc_lbl, draw_gauge,
        validate_opts, changed_opts,
        gauge_remove,
        get_gauge_container,
        set_error, set_opts, set_value,
        class_destroy,
        class_init_props, class_init,

        prev_draw_data = {}, draw_data = {};

      extend_obj = function (o1, o2, deep) {
        if (deep === undefined) { deep = false; }
        var
          x,
          is_arr = Array.isArray,
          is_obj = function (ob) {
            if (ob && typeof ob === 'object' && String(ob) === '[object Object]') { return true; }
            return false;
          };
        if (is_arr(o2)) {
          if (!o1 || (!is_arr(o1) && !is_obj(o1))) { o1 = []; }
          for (x = 0; x < o2.length; x++) {
            if (deep && (is_arr(o2[x]) || is_obj(o2[x]))) {
              o1[x] = extend_obj(o1[x], o2[x], deep);
            }
            else { o1[x] = o2[x]; }
          }
        }
        else if (is_obj(o2)) {
          if (!o1 || (!is_obj(o1) && !is_arr(o1))) { o1 = {}; }
          for (x in o2) { if (o2.hasOwnProperty(x)) {
            if (deep && (is_obj(o2[x]) || is_arr(o2[x]))) {
              o1[x] = extend_obj(o1[x], o2[x], deep);
            }
            else { o1[x] = o2[x]; }
          } }
        }
        else { return {}; }
        return o1;
      };

      mix_colors = function (pcol1, pcol2, amount) {
        var
          h_diff = pcol2.h - pcol1.h,
          s_diff = pcol2.s - pcol1.s,
          l_diff = pcol2.l - pcol1.l,
          opacity_diff = pcol2.opacity - pcol1.opacity,
          h_res, s_res, l_res, opacity_res,
          rgb;
        h_diff *= 360;
        if (h_diff > 180 || h_diff < -180) { h_diff -= 360 * Math.round(h_diff / 360); }
        h_diff /= 360;

        h_res = pcol1.h + h_diff * amount;
        h_res = h_res % 1;
        if (h_res < 0) { h_res += 1; }
        s_res = pcol1.s + s_diff * amount;
        l_res = pcol1.l + l_diff * amount;
        rgb = Snap.hsl2rgb(h_res, s_res, l_res);

        opacity_res = pcol1.opacity + opacity_diff * amount;
        if (opacity_res !== 1) { rgb.opacity = Math.round(opacity_res * 100) / 100; }

        return rgb.toString();
      };
      get_perc_color = function (perc) {
        if (perc === undefined) { perc = draw_data.val_perc; }
        var
          color_interpolate = true,
          ac = draw_data.arc_colors,
          i, t = ac.length,
          ret = ac[t - 1],
          col1, col2,
          diff, v_in;
        if (draw_data.ranges.length === 2) {
          if (perc > ac[1].min && perc < ac[1].max) {
            diff = ac[1].max - ac[1].min;
            ret = {color: mix_colors(ac[0].pcolor, ac[2].pcolor, (perc - ac[1].min) / diff)};
          }
          else if (perc <= ac[0].max) { ret = ac[0]; }
          else { ret = ac[2]; }
        }
        else {
          for (i = 0; i < t; i++) {
            if (perc < ac[i].max) {
              col1 = ac[i];
              col2 = ac[i - 1];
              break;
            }
          }
          if (color_interpolate && col2) {
            diff = col1.max - col2.max;
            v_in = perc - col2.max;
            ret = {color: mix_colors(col1.pcolor, col2.pcolor, 1 - v_in / diff)};
          }
          else if (col1) { ret = col1; }
        }
        return ret.color;
      };
      get_pcolor = function (color) {
        if (pcolors[color]) { return pcolors[color]; }
        var pcolor = Snap.color(color);
        if (!pcolor.error) { pcolors[color] = pcolor; }
        return pcolor;
      };
      get_colors_bar = function (pcolor_from, pcolor_to, sizes, amounts) {
        var
          color_mixed, pcolor_mixed,
          i, ret = [];
        for (i = 0; i < sizes.length; i++) {
          color_mixed = mix_colors(pcolor_from, pcolor_to, amounts[i]);
          pcolor_mixed = get_pcolor(color_mixed);
          ret.push({color: color_mixed, size: sizes[i], pcolor: pcolor_mixed});
        }
        return ret;
      };

      text_resize_timed_clear = function (type) {
        var
          x,
          timer;
        if (type) {
          if (!text_resize_timers.hasOwnProperty(type)) { text_resize_timers[type] = []; }
          while (text_resize_timers[type].length) {
            timer = text_resize_timers[type].shift();
            clearTimeout(timer);
          }
        }
        else {
          for (x in text_resize_timers) { if (text_resize_timers.hasOwnProperty(x)) {
            while (text_resize_timers[x].length) {
              timer = text_resize_timers[x].shift();
              clearTimeout(timer);
            }
          } }
        }
      };
      text_resize_timed = function (cb, type) {
        var
          delay = 800,
          timeout = 2000,
          now,
          ms,
          ff = g_els.lbl_val.attr('fontFamily');
        text_resize_timed_clear(type);
        cb();
        if (
          !fonts_loaded_or_timeout[ff]
        ) {
          now = new Date();
          if (now - js_start > timeout) { fonts_loaded_or_timeout[ff] = true; }
          if (!text_resize_timers.hasOwnProperty(type)) { text_resize_timers[type] = []; }
          text_resize_timers[type].push(setTimeout(cb, 0));
          ms = Math.max(0, (now - js_start) + delay);
          if (ms > 0) {
            text_resize_timers[type].push(setTimeout(cb, ms));
          }
        }
      };

      get_title_fsize = function () {
        var
          max_len = 0,
          mult = 0.75,
          fsize;
        opts.title.forEach(function (line) { max_len = Math.max(max_len, line.length); });
        if (draw_data.lbl_title_hover) {
          opts.titleHover.forEach(function (line) { max_len = Math.max(max_len, line.length); });
        }
        if (max_len > 16) { fsize = draw_data.lbl_title_size * mult * mult; }
        else if (max_len > 12) { fsize = draw_data.lbl_title_size * mult; }
        return fsize;
      };

      set_draw_data = function (change) {
        if (that.error) { return; }
        var
          arr,
          bp_len,
          i, arcs,
          diff, size, found, spacing,
          zone_start,
          cc;
        //
        draw_data.arc_coverage = 71; //percentage
        draw_data.arc_corner_radius = 3;
        draw_data.radius_in = 81;
        draw_data.radius_in_track = 70;
        draw_data.radius_out = 106;
        draw_data.radius_lbl = 110;
        draw_data.svg_height = 274;
        draw_data.svg_width = 372;
        draw_data.circle_vcenter = 136;
        draw_data.hcenter = draw_data.svg_width / 2;
        draw_data.lbl_val_color = '#424141';
        draw_data.lbl_val_size = 49.72;
        draw_data.lbl_val_y = 137.93;
        draw_data.lbl_in_color = '#c5c4c4';
        draw_data.lbl_in_size = 20.16;
        draw_data.lbl_in_y = 164.2;
        draw_data.lbl_title_color = '#979797';
        draw_data.lbl_title_size = 30.24;
        draw_data.lbl_title_y = 234.23;
        draw_data.lbl_arc_color = '#595958';
        draw_data.lbl_arc_size = 21.16;
        //
        draw_data.max_inside_w = ((Math.min(draw_data.radius_in, draw_data.radius_in_track) - 6) * 2);
        //flags
        draw_data.lbl_title_hover = opts.titleHover !== null;
        //ranges
        draw_data.ranges = [];
        draw_data.ranges.push({low: opts.minValue, high: opts.breakpoints[0]});
        for (i = 1; i < opts.breakpoints.length; i++) {
          draw_data.ranges.push({low: opts.breakpoints[i - 1] + opts.breakpointsSeparation, high: opts.breakpoints[i]});
        }
        draw_data.ranges.push({low: opts.breakpoints[opts.breakpoints.length - 1] + opts.breakpointsSeparation, high: opts.maxValue});
        //values
        arr = draw_data.ranges.map(function (v) { return (v.low || 0); });
        draw_data.val_lowest = Math.min.apply(null, arr);
        arr = draw_data.ranges.map(function (v) { return (v.high || 0); });
        draw_data.val_highest = Math.max.apply(null, draw_data.ranges.map(function (v) { return v.high; }));
        opts.value = Math.max(draw_data.val_lowest, Math.min(draw_data.val_highest, opts.value));
        draw_data.val_diff = draw_data.val_highest - draw_data.val_lowest;
        draw_data.val_perc = (opts.value - draw_data.val_lowest) / draw_data.val_diff;
        //angles
        draw_data.arc_total = (360 * Math.max(0, Math.min(100, draw_data.arc_coverage)) / 100);
        draw_data.arc_start = 180 - (draw_data.arc_total / 2);
        //colors
        //reuse colors
        if (!change.color_segments && !change.ranges) {
          draw_data.color_segments = prev_draw_data.color_segments;
          draw_data.colors = prev_draw_data.colors;
        }
        //generate colors
        else {
          //default colors
          if (opts.colorSegments === null) {
            if (opts.direction === DIRECTION_SWEET) {
              draw_data.color_segments = [base_color.red, base_color.yellow, base_color.green];
            }
            else {
              bp_len = opts.breakpoints.length;
              if (opts.direction === DIRECTION_DOWN) {
                draw_data.color_segments = [base_color.green];
                if (bp_len > 1) { draw_data.color_segments.push(base_color.yellow); }
                if (bp_len > 2) { draw_data.color_segments.push(base_color.orange); }
                if (bp_len > 3) { draw_data.color_segments.unshift(base_color.blue); }
                draw_data.color_segments.push(base_color.red);
              }
              else if (opts.direction === DIRECTION_UP) {
                draw_data.color_segments = [base_color.green];
                if (bp_len > 1) { draw_data.color_segments.unshift(base_color.yellow); }
                if (bp_len > 2) { draw_data.color_segments.unshift(base_color.orange); }
                if (bp_len > 3) { draw_data.color_segments.push(base_color.blue); }
                draw_data.color_segments.unshift(base_color.red);
              }
            }
          }
          //passed colors
          else { draw_data.color_segments = opts.colorSegments.slice(); }
          //repeat colors on DIRECTION_SWEET
          if (opts.direction === DIRECTION_SWEET) { draw_data.color_segments.push(draw_data.color_segments[1], draw_data.color_segments[0]); }
          //generate color bars
          if (opts.direction === DIRECTION_SWEET) {
            draw_data.colors = draw_data.color_segments.map(function (color, i) {
              var
                pcolor = get_pcolor(color),
                pcolor_next, list;
              if (i === 0 || i === 4) {
                list = [{color: color, size: 100, pcolor: pcolor}];
              }
              else if (i === 2) {
                pcolor_next = get_pcolor(draw_data.color_segments[1]);
                list = get_colors_bar(pcolor, pcolor_next, [5, 5, 80], [0.1, 0.05, 0]);
                list.push(list[1], list[0]);
              }
              else if (i === 1 || i === 3) {
                pcolor_next = get_pcolor(draw_data.color_segments[0]);
                list = get_colors_bar(pcolor, pcolor_next, [70, 10, 10, 10], [0, 0.1, 0.2, 0.3]);
                if (i === 1) { list.reverse(); }
              }
              return ({color: color, colors: list});
            });
          }
          else {
            //2 segments
            if (draw_data.color_segments.length === 2) {
              draw_data.colors = draw_data.color_segments.map(function (color) {
                return ({color: color, colors: [
                  {color: color, size: 100, pcolor: get_pcolor(color)}
                ]});
              });
            }
            //more than 2 segments
            else {
              draw_data.colors = draw_data.color_segments.map(function (color, i) {
                var
                  pcolor = get_pcolor(color),
                  pcolor_next, list;
                if (i < draw_data.color_segments.length - 1) {
                  pcolor_next = get_pcolor(draw_data.color_segments[i + 1]);
                  list = get_colors_bar(pcolor, pcolor_next, [70, 10, 10, 10], [0, 0.1, 0.2, 0.3]);
                }
                else {
                  list = [{color: color, size: 100, pcolor: pcolor}];
                }
                return ({color: color, colors: list});
              });
            }
          }
        }
        //arc colors
        cc = draw_data.colors;
        zone_start = 0;
        if (draw_data.ranges.length === 2) {
          draw_data.arc_colors = [
            {
              color: cc[0].colors[0].color,
              max: (draw_data.ranges[0].high - draw_data.ranges[0].low) / draw_data.val_diff,
              min: 0,
              pcolor: cc[0].colors[0].pcolor
            },
            {
              max: (draw_data.ranges[1].low - draw_data.ranges[0].low) / draw_data.val_diff
            },
            {
              color: cc[1].colors[0].color,
              max: 1,
              pcolor: cc[1].colors[0].pcolor
            }
          ];
          draw_data.arc_colors[1].min = draw_data.arc_colors[0].max;
          draw_data.arc_colors[2].min = draw_data.arc_colors[1].max;
        }
        else {
          draw_data.arc_colors = [];
          cc.forEach(function (zone, i) {
            var
              max = 0,
              ob,
              zone_mult = [
                draw_data.ranges[i].low,
                draw_data.ranges[i].high
              ];
            if (i) {
              zone_mult[0] = (zone_mult[0] + draw_data.ranges[i - 1].high) / 2;
            }
            if (cc[i + 1] !== undefined) {
              zone_mult[1] = (zone_mult[1] + draw_data.ranges[i + 1].low) / 2;
            }
            zone_mult = (zone_mult[1] - zone_mult[0]) / draw_data.val_diff;
            zone.colors.forEach(function (v) {
              max += v.size;
              ob = {
                color: v.color,
                max: zone_start + max / 100 * zone_mult,
                pcolor: v.pcolor
              };
              draw_data.arc_colors.push(ob);
            });
            zone_start += zone_mult;
          });
        }
        //arcs
        draw_data.arcs = [];
        arcs = {
          amount: draw_data.ranges.length,
          total: 0,
          aused: [], aunused: []
        };
        arcs.seps = arcs.amount - 1;
        for (i = 0; i < arcs.amount; i++) {
          diff = draw_data.ranges[i].high - draw_data.ranges[i].low;
          arcs.aused.push(diff);
          arcs.total += diff;
          if (i) {
            size = opts.arcSeparator === 'auto' ?
              opts.breakpointsSeparation :
              (
                opts.arcSeparator / draw_data.arc_total *
                draw_data.val_diff / draw_data.arc_total * 360
              );
            arcs.aunused.push(size);
            arcs.total += size;
          }
        }
        arcs.start = draw_data.arc_start;
        spacing = 0;
        for (i = 0; i < arcs.amount; i++) {
          size = arcs.aused[i] / arcs.total * draw_data.arc_total;
          draw_data.arcs.push({
            color: cc[i].color,
            end: arcs.start + size,
            start: arcs.start,
            size: size,
            spacing_before: spacing
          });
          spacing = arcs.aunused[i] / arcs.total * draw_data.arc_total;
          arcs.start += size + spacing;
        }
        //arc_val
        draw_data.arc_val = draw_data.arc_total * draw_data.val_perc;
        //arc_val with ranges
        if (opts.hover || opts.hoverInvert) {
          found = false;
          for (i = 0; i < draw_data.ranges.length; i++) {
            if (opts.value >= draw_data.ranges[i].low && opts.value <= draw_data.ranges[i].high) {
              found = true;
              break;
            }
          }
          //inside range
          if (found) {
            diff = draw_data.ranges[i].high - draw_data.ranges[i].low;
            size = draw_data.arcs[i].size;
            size *= (opts.value - draw_data.ranges[i].low) / diff;
            draw_data.arc_val = draw_data.arcs[i].start - draw_data.arc_start + size;
          }
          //outside range
          else {
            for (i = 0; i < draw_data.ranges.length; i++) {
              if (opts.value < draw_data.ranges[i].high) { break; }
            }
            if (i) {
              diff = draw_data.ranges[i].low - draw_data.ranges[i - 1].high;
              size = draw_data.arcs[i].start - draw_data.arcs[i - 1].end;
              size *= (opts.value - draw_data.ranges[i].low) / diff;
              draw_data.arc_val = draw_data.arcs[i].start - draw_data.arc_start + size;
            }
          }
        }
        //center
        draw_data.center = {x: draw_data.hcenter, y: draw_data.circle_vcenter};
      };

      hover_view_in = function () {
        if (opts.hover) {
          var
            el1 = opts.hoverInvert ? g_els.view1 : g_els.view2,
            el2 = opts.hoverInvert ? g_els.view2 : g_els.view1;
          el1.animate({opacity: 1}, opts.animDurationHover);
          el2.animate({opacity: 0}, opts.animDurationHover);
          is_view_hovered = true;
        }
      };
      hover_view_out = function () {
        if (opts.hover) {
          var
            el1 = opts.hoverInvert ? g_els.view1 : g_els.view2,
            el2 = opts.hoverInvert ? g_els.view2 : g_els.view1;
          el1.animate({opacity: 0}, opts.animDurationHover);
          el2.animate({opacity: 1}, opts.animDurationHover);
          is_view_hovered = false;
        }
      };

      hover_title_in = function () {
        if (draw_data.lbl_title_hover) {
          g_els.lbl_title.animate({opacity: 0}, opts.animDurationHover);
          g_els.lbl_title_hover.animate({opacity: 1}, opts.animDurationHover);
        }
      };
      hover_title_out = function () {
        if (draw_data.lbl_title_hover) {
          g_els.lbl_title.animate({opacity: 1}, opts.animDurationHover);
          g_els.lbl_title_hover.animate({opacity: 0}, opts.animDurationHover);
        }
      };

      point_on_arc = function (r, angle) {
        var radians = (angle + 90) * RAD_DEG;
        return {
          x: draw_data.center.x + r * Math.cos(radians),
          y: draw_data.center.y + r * Math.sin(radians)
        };
      };
      path_pie_sector = function (deg_start, deg_size, view2) {
        var
          corner_radius = (view2 && opts.arcSeparator === 0) ? 0 : draw_data.arc_corner_radius,
          center = draw_data.center,
          r_in = draw_data.radius_in,
          r_out = draw_data.radius_out,
          ring_points = function () {
            return [
              'M', center.x - r_out, center.y,
              'A', r_out, r_out, 0, 1, 0, center.x + r_out, center.y,
              'A', r_out, r_out, 0, 1, 0, center.x - r_out, center.y,
              'M', center.x - r_in, center.y, 'A', r_in, r_in, 0, 1, 0, center.x + r_in, center.y,
              'A', r_in, r_in, 0, 1, 0, center.x - r_in, center.y,
              'Z'
            ];
          },
          arc_points = function () {
            var
              ret,
              thickness = r_out - r_in,
              deg_end = deg_start + deg_size,
              corner = corner_radius,
              circumference = Math.abs(deg_end - deg_start),
              corner_r_in, corner_r_out,
              o_start, o_end,
              i_start, i_end,
              i_section, o_section,
              i_arc_start, i_arc_end,
              o_arc_start, o_arc_end,
              arc_sweep1, arc_sweep2;
            //corner adjust
            corner = Math.min(thickness / 2, corner);
            if (360 * (corner / (Math.PI * (r_out - thickness))) > Math.abs(deg_start - deg_end)) {
              corner = circumference / 360 * r_in * Math.PI;
            }
            // inner and outer radiuses
            corner_r_in = r_in + corner;
            corner_r_out = r_out - corner;
            // butts corner points
            o_start = point_on_arc(corner_r_out, deg_start);
            o_end = point_on_arc(corner_r_out, deg_end);
            i_start = point_on_arc(corner_r_in, deg_start);
            i_end = point_on_arc(corner_r_in, deg_end);
            i_section = 360 * (corner / (PI2 * r_in));
            o_section = 360 * (corner / (PI2 * r_out));
            // arcs endpoints
            i_arc_start = point_on_arc(r_in, deg_start + i_section);
            i_arc_end = point_on_arc(r_in, deg_end - i_section);
            o_arc_start = point_on_arc(r_out, deg_start + o_section);
            o_arc_end = point_on_arc(r_out, deg_end - o_section);
            arc_sweep1 = circumference > 180 + 2 * o_section ? 1 : 0;
            arc_sweep2 = circumference > 180 + 2 * i_section ? 1 : 0;
            ret = [
              'M', o_start.x, o_start.y,
              'A', corner, corner, 0, 0, 1, o_arc_start.x, o_arc_start.y,
              'A', r_out, r_out, 0, arc_sweep1, 1, o_arc_end.x, o_arc_end.y,
              'A', corner, corner, 0, 0, 1, o_end.x, o_end.y,
              'L', i_end.x, i_end.y,
              'A', corner, corner, 0, 0, 1, i_arc_end.x, i_arc_end.y,
              'A', r_in, r_in, 0, arc_sweep2, 0, i_arc_start.x, i_arc_start.y,
              'A', corner, corner, 0, 0, 1, i_start.x, i_start.y,
              'Z'
            ];
            return ret;
          },
          points;
        if (deg_size === 360) { points = ring_points(); }
        else { points = arc_points(); }
        return points.join(' ');
      };

      value_text = function (v, is_arc) {
        return opts.valueFormat(v, is_arc);
      };
      size_lbl_val = function () {
        var
          mult = 0.75,
          new_attrs = {visibility: ''},
          bbox;
        //reset
        g_els.lbl_val.attr({fontSize: draw_data.lbl_val_size});
        //measure & adjust
        bbox = g_els.lbl_val.getBBox();
        if (bbox.width > draw_data.max_inside_w / mult) {
          new_attrs.fontSize = Math.round(draw_data.lbl_val_size * mult * mult * 100) / 100;
        }
        else if (bbox.width > draw_data.max_inside_w) {
          new_attrs.fontSize = Math.round(draw_data.lbl_val_size * mult * 100) / 100;
        }
        g_els.lbl_val.attr(new_attrs);
      };
      set_lbl_val = function (value) {
        value = value_text(value);
        g_els.lbl_val.attr({text: [value], visibility: 'hidden'});
        text_resize_timed(size_lbl_val, 'lbl_val');
      };
      animate_value = function () {
        var
          val_start = prev_opts.hasOwnProperty('value') ?
            prev_opts.value : draw_data.val_lowest,
          perc_start = prev_draw_data.hasOwnProperty('val_perc') ?
            prev_draw_data.val_perc : 0,
          deg_start = prev_draw_data.hasOwnProperty('arc_val') ?
            prev_draw_data.arc_val : 0,
          val_diff = opts.value - val_start,
          perc_diff = draw_data.val_perc - perc_start,
          deg_diff = draw_data.arc_val - deg_start,
          last_value;
        Snap.animate(0, 1, function (pos) {
          if (isNaN(pos)) { pos = 1; }
          var value = val_start + val_diff * pos;
          g_els.view1_val_arc.attr({
            fill: get_perc_color(perc_start + perc_diff * pos),
            d: path_pie_sector(draw_data.arc_start, deg_start + deg_diff * pos)
          });
          g_els.view2_track.attr({
            transform: 'rotate(' + (draw_data.arc_start + deg_start + deg_diff * pos) + ',' + draw_data.center.x + ',' + draw_data.center.y + ')'
          });
          if (value !== last_value || pos === 1) {
            set_lbl_val(value);
            last_value = value;
          }
        }, opts.demo ? 0 : (first_draw ? opts.animDurationArcFirst : opts.animDurationArc));
      };

      pos_arc_lbl = function (point, el, reset_to_point) {
        var
          is_top_center = Math.abs(draw_data.hcenter - point.x) < draw_data.hcenter * 0.05,
          is_left = point.x < draw_data.center.x,
          is_top = point.y > draw_data.center.y,
          new_attrs = {visibility: ''},
          bbox;
        //reset
        if (reset_to_point) { el.attr(point); }
        //get bbox
        bbox = el.getBBox();
        //save
        list_arc_lbl.push({el: el, point: point});
        //adjust position
        if (is_top_center) {
          new_attrs.x = bbox.x + bbox.width / 2;
          new_attrs.y = bbox.y + bbox.height;
        }
        else {
          new_attrs.x = bbox.x + (is_left ? bbox.width : 0);
          new_attrs.y = bbox.y + (is_top ? 0 : bbox.height);
        }
        new_attrs.x = point.x - (new_attrs.x - point.x);
        new_attrs.y = point.y - (new_attrs.y - point.y);
        el.attr(new_attrs);
      };
      draw_arc_lbl = function (angle, val) {
        var
          point = point_on_arc(draw_data.radius_lbl, angle),
          is_top_center = Math.abs(draw_data.hcenter - point.x) < draw_data.hcenter * 0.05,
          is_left = point.x < draw_data.center.x,
          text;
        text = g_els.view2_arc_labels.text(
          point.x, point.y,
          [value_text(val, true)]
        ).attr({
          fill: draw_data.lbl_val_color,
          textAnchor: is_top_center ? 'middle' : (is_left ? 'end' : 'start'),
          visibility: 'hidden'
        });
        pos_arc_lbl(point, text);
      };
      draw_gauge = function (change) {
        if (that.error) { return; }
        var
          x,
          css, attr,
          tmp;
        //create
        if (first_draw) {
          //svg create/append
          g_els.svg = new Snap(draw_data.svg_width, draw_data.svg_height);
          g_els.svg.node.style.display = 'none';
          that.container.appendChild(g_els.svg.node);
          //svg css, attr
          css = {display: ''};
          attr = {};
          if (opts.responsive) {
            tmp = window.getComputedStyle(that.container).getPropertyValue('position');
            if (tmp === 'relative' || tmp === 'absolute') {
              css.left = 0;
              css.position = 'absolute';
              css.top = 0;
            }
            css.height = '100%';
            css.width = '100%';
            attr.preserveAspectRatio = 'xMidYMid meet';
            attr.viewBox = '0 0 ' + draw_data.svg_width + ' ' + draw_data.svg_height;
          }
          for (x in css) { if (css.hasOwnProperty(x)) { g_els.svg.node.style[x] = css[x]; } }
          g_els.svg.attr(attr);
          //view1
          g_els.view1 = g_els.svg.g().addClass('view1');
          tmp = path_pie_sector(draw_data.arc_start, draw_data.arc_total);
          g_els.view1.path(tmp).attr({fill: '#e5e5e5', fillRule: 'evenodd'});
          tmp = path_pie_sector(draw_data.arc_start, 0);
          g_els.view1_val_arc = g_els.view1.path(tmp).attr({fill: 'none', fillRule: 'evenodd'});
          //view2
          g_els.view2 = g_els.svg.g().addClass('view2');
          g_els.view2_arcs = g_els.view2.g().addClass('arcs');
          tmp = {x: (draw_data.center.x + 6.8), y: (draw_data.center.y + draw_data.radius_in_track)};
          g_els.view2_track = g_els.view2.path(
            'M' + tmp.x + ',' + tmp.y + ' c 0.7,0 1.2,0.6 1.2,1.3 v 4.1 c 0,0.2 -0.1,0.4 -0.2,0.6 l -7,8.8 c -0.3,0.3 -0.7,0.4 -0.8,0.4 -0.1,0 -0.5,-0.1 -0.8,-0.4 l -7,-8.8 c -0.1,-0.2 -0.2,-0.4 -0.2,-0.6 l -0.1,-4.1 c 0,-0.7 0.6,-1.3 1.3,-1.3 l 0,0 c 2.2,0.1 4.4,0.2 6.8,0.2 2.4,0 6.8,-0.2 6.8,-0.2 z'
          ).attr({
            fill: '#595958',
            transform: 'rotate(' + draw_data.arc_start + ',' + draw_data.center.x + ',' + draw_data.center.y + ')'
          });
          //view2 labels
          g_els.view2_arc_labels = g_els.view2.g().addClass('arc_labels');
          //labels
          g_els.labels = g_els.svg.g().addClass('labels');
          g_els.lbl_val = g_els.labels.text(
            draw_data.hcenter, draw_data.lbl_val_y,
            ['']
          ).attr({
            fill: draw_data.lbl_val_color, fontSize: draw_data.lbl_val_size, textAnchor: 'middle'
          });
          g_els.lbl_in = g_els.labels.text(
            draw_data.hcenter, draw_data.lbl_in_y, []
          ).attr({
            fill: draw_data.lbl_in_color, fontSize: draw_data.lbl_in_size, textAnchor: 'middle'
          });

          g_els.lbl_title_hover = g_els.labels.text(
            draw_data.hcenter, draw_data.lbl_title_y, []
          ).attr({
            fill: draw_data.lbl_title_color, fontSize: draw_data.lbl_title_size, opacity: 0, textAnchor: 'middle'
          });
          g_els.lbl_title = g_els.labels.text(
            draw_data.hcenter, draw_data.lbl_title_y, []
          ).attr({
            fill: draw_data.lbl_title_color, fontSize: draw_data.lbl_title_size, textAnchor: 'middle'
          });

          //hover text
          g_els.lbl_title.hover(hover_title_in, hover_title_out);
          //hover view
          g_els.hover_view = g_els.svg.g().addClass('hover');
          tmp = draw_data.center.y - (draw_data.radius_out + 4);
          g_els.hover_view_area = g_els.hover_view.rect(
            draw_data.center.x - (draw_data.radius_out + 4),
            tmp,
            (draw_data.radius_out + 4) * 2,
            point_on_arc(draw_data.radius_out + 4, draw_data.arc_start).y - tmp
          ).attr({
            fill: '#FFFFFF', fillOpacity: 0
          });
          g_els.hover_view_area.hover(hover_view_in, hover_view_out);
        }
        //update
        //value
        if (change.val) {
          animate_value();
        }
        //view
        if (change.view) {
          tmp = opts.hoverInvert;
          if (is_view_hovered && opts.hover) { tmp = !tmp; }
          g_els.view1.stop().attr({opacity: tmp ? 0 : 1});
          g_els.view2.stop().attr({opacity: tmp ? 1 : 0});
        }
        //demo
        if (change.demo) {
          g_els.view2_track.attr({opacity: opts.demo ? 0 : 1});
        }
        //arcs
        if (change.ranges) {
          g_els.view2_arcs.selectAll('path').remove();
          draw_data.arcs.forEach(function (v) {
            g_els.view2_arcs.path(path_pie_sector(v.start, v.size, true)).attr({
              fill: v.color, fillRule: 'evenodd'
            });
          });
        }
        //view2 range labels
        if (change.lbl_ranges) {
          list_arc_lbl = [];
          g_els.view2_arc_labels.selectAll('text').remove();
          g_els.view2_arc_labels.attr({fontSize: draw_data.lbl_arc_size});
          if (opts.labelRangesStart) {
            draw_arc_lbl(draw_data.arc_start, draw_data.val_lowest);
          }
          if (opts.labelRanges) {
            draw_data.arcs.forEach(function (v, i) {
              if (i) {
                draw_arc_lbl(v.start - v.spacing_before / 2, draw_data.ranges[i - 1].high);
              }
            });
          }
          if (opts.labelRangesEnd) {
            draw_arc_lbl(draw_data.arc_start + draw_data.arc_total, draw_data.val_highest);
          }
          //get all lbls max width
          tmp = list_arc_lbl.map(function (ob) {
            ob.bbox = ob.el.getBBox();
            return ob.bbox.width;
          });
          //reduce size if max width is too long
          if (Math.max.apply(null, tmp) > 84) {
            g_els.view2_arc_labels.attr({fontSize: Math.round(draw_data.lbl_arc_size * 0.75 * 100) / 100});
          }
        }
        //unit
        if (change.lbl_in) {
          g_els.lbl_in.attr({
            text: opts.unit
          }).selectAll('tspan').forEach(function (tspan, i) {
            tspan.attr({x: draw_data.hcenter, dy: i ? draw_data.lbl_in_size : 0});
          });
        }
        //title
        if (change.lbl_title || change.lbl_title_hover) {
          tmp = get_title_fsize();
          g_els.lbl_title_hover.attr({
            fontSize: tmp,
            text: opts.titleHover === null ? '' : opts.titleHover
          }).selectAll('tspan').forEach(function (tspan, i) {
            tspan.attr({x: draw_data.hcenter, dy: i ? draw_data.lbl_title_size : 0});
          });
          g_els.lbl_title.attr({
            fontSize: tmp,
            text: opts.title
          }).selectAll('tspan').forEach(function (tspan, i) {
            tspan.attr({x: draw_data.hcenter, dy: i ? draw_data.lbl_title_size : 0});
          });
        }
        //first draw done
        first_draw = false;
      };

      validate_opts = function (opts) {
        if (that.error) { return; }
        var
          is_invalid_color = function (color) {
            return get_pcolor(color).error;
          },
          is_invalid_bp = function (v, i) {
            var diff;
            if (i < opts.breakpoints.length - 1) {
              diff = opts.breakpoints[i + 1] - v;
              if (diff <= opts.breakpointsSeparation) { return true; }
            }
            return false;
          };
        if (
          opts.direction !== DIRECTION_UP &&
          opts.direction !== DIRECTION_DOWN &&
          opts.direction !== DIRECTION_SWEET
        ) {
          set_error('expected ' + DIRECTION_UP + ', ' + DIRECTION_DOWN + ' or ' + DIRECTION_SWEET + ' for direction');
          return;
        }
        if (!opts.breakpoints || !opts.breakpoints.length || typeof opts.breakpoints !== 'object') {
          set_error('expected at least one breakpoint for breakpoints array');
          return;
        }
        if (typeof opts.minValue !== 'number' || typeof opts.maxValue !== 'number') {
          set_error('expected a number for both minValue and maxValue');
          return;
        }
        if (typeof opts.value !== 'number') {
          set_error('expected a number for value');
          return;
        }
        if (opts.breakpoints.some(function (v) { return (typeof v !== 'number'); })) {
          set_error('expected a number for every element of breakpoints');
          return;
        }
        if (opts.minValue >= opts.breakpoints[0]) {
          set_error('expected for minValue to be smaller than any number on breakpoints');
          return;
        }
        if (opts.maxValue <= opts.breakpoints[opts.breakpoints.length - 1]) {
          set_error('expected for maxValue to be bigger than any number on breakpoints');
          return;
        }
        if (opts.breakpoints.some(is_invalid_bp)) {
          set_error('every breakpoint value has to be bigger than the next for more than ' + opts.breakpointsSeparation);
          return;
        }

        if (opts.direction === DIRECTION_SWEET) {
          if (opts.breakpoints.length !== 4) {
            set_error('expected 4 items for breakpoints when direction is 2(sweet spot)');
            return;
          }
        }
        if (opts.colorSegments === null) {
          if (opts.breakpoints.length > 4) {
            set_error('expected array with colors for colorSegments when there are 5 or more breakpoints');
            return;
          }
        }
        else {
          if (!opts.colorSegments || !opts.colorSegments.length) {
            set_error('expected array with colors for colorSegments');
            return;
          }
          if (opts.colorSegments.some(is_invalid_color)) {
            set_error('expected colorSegments array to have valid css colors');
            return;
          }
          if (opts.direction === DIRECTION_SWEET) {
            if (opts.colorSegments.length !== 3) {
              set_error('expected 3 colors for colorSegments when direction is 2(sweet spot)');
              return;
            }
          }
          else {
            if (opts.colorSegments.length - 1 !== opts.breakpoints.length) {
              set_error('expected colorSegments to have one item more than breakpoints');
              return;
            }
          }
        }
      };
      changed_opts = function () {
        var
          change = {
            lbl_in: first_draw || JSON.stringify(prev_opts.unit) !== JSON.stringify(opts.unit),
            lbl_title: first_draw || JSON.stringify(prev_opts.title) !== JSON.stringify(opts.title),
            lbl_title_hover: first_draw || JSON.stringify(prev_opts.titleHover) !== JSON.stringify(opts.titleHover),
            lbl_val: (
              first_draw ||
              prev_opts.value !== opts.value ||
              prev_opts.valueFormat !== opts.valueFormat
            ),
            color_segments: (
              (!prev_opts.colorSegments && opts.colorSegments) ||
              (prev_opts.colorSegments && !opts.colorSegments) ||
              (
                prev_opts.colorSegments && opts.colorSegments &&
                prev_opts.colorSegments.length !== opts.colorSegments.length
              ) ||
              JSON.stringify(prev_opts.colorSegments) !== JSON.stringify(opts.colorSegments)
            ),
            direction: prev_opts.direction !== opts.direction,
            ranges: (
              prev_opts.breakpoints.length !== opts.breakpoints.length ||
              prev_opts.maxValue !== opts.maxValue ||
              prev_opts.minValue !== opts.minValue ||
              JSON.stringify(prev_opts.breakpoints) !== JSON.stringify(opts.breakpoints)
            ),
            view: (
              first_draw ||
              prev_opts.hover !== opts.hover ||
              prev_opts.hoverInvert !== opts.hoverInvert
            ),
            demo: prev_opts.demo !== opts.demo
          };
        change.lbl_ranges = (
            first_draw ||
            change.ranges ||
            prev_opts.labelRanges !== opts.labelRanges ||
            prev_opts.labelRangesEnd !== opts.labelRangesEnd ||
            prev_opts.labelRangesStart !== opts.labelRangesStart
        );
        change.val = change.demo || change.lbl_val || change.ranges;
        change.demo = first_draw || change.demo;
        change.lbl_val = first_draw || change.lbl_val;
        change.color_segments = first_draw || change.direction || change.color_segments;
        change.ranges = first_draw || change.ranges;
        return change;
      };

      gauge_remove = function () {
        text_resize_timed_clear();
        g_els.lbl_title.unhover(hover_title_in, hover_title_out);
        g_els.hover_view_area.unhover(hover_view_in, hover_view_out);
        g_els.svg.remove();
      };

      get_gauge_container = function (c) {
        //jquery/html/N/A
        if (window.jQuery && c instanceof window.jQuery && c.length) { return c[0]; }
        if (c instanceof window.Element || c instanceof window.HTMLDocument) { return c; }
        return false;
      };

      set_error = function (msg) {
        that.error = msg;
        //setTimeout(function () { throw ('Gauge error: ' + msg); }, 0);
      };
      set_opts = function (set_opts) {
        that.error = false;
        prev_opts = that.opts || extend_obj({}, def_opts, true);
        set_opts = set_opts || {};
        var
          new_opts = extend_obj({}, extend_obj(extend_obj({}, prev_opts), set_opts), true),
          change;
        //validations
        validate_opts(new_opts);
        if (!that.error) {
          //normalize
          if (typeof new_opts.title === 'string') { new_opts.title = [new_opts.title]; }
          if (typeof new_opts.titleHover === 'string') { new_opts.titleHover = [new_opts.titleHover]; }
          if (typeof new_opts.unit === 'string') { new_opts.unit = [new_opts.unit]; }
          //save data and draw
          opts = that.opts = new_opts;
          prev_draw_data = draw_data;
          draw_data = {};
          change = changed_opts();
          set_draw_data(change);
          draw_gauge(change);
        }
      };
      set_value = function (v) {
        set_opts({value: v});
      };

      class_destroy = function () {
        gauge_remove();
        that.error = false;
        opts = that.opts = extend_obj({}, def_opts, true);
        prev_opts = undefined;
        first_draw = true;
        prev_draw_data = {};
        draw_data = {};
        g_els = {};
      };

      class_init_props = function () {
        that.container = false;
        that.error = false;
        opts = that.opts = extend_obj({}, def_opts, true);

        that.destroy = class_destroy;
        that.setOpts = set_opts;
        that.setValue = set_value;
      };
      class_init = function () {
        if (!window.Snap) { set_error('Missing Snap.svg'); }
        else {
          class_init_props();
          that.container = get_gauge_container(container);
          if (!that.container) { set_error('No valid container specified'); }
          else { set_opts(copts); }
        }
      };

      class_init();
    };
  window.Gauge = Gauge;
}());