import "./global";

import Vue from "vue";
import App from "./App.vue";
import router from "./router.js";
import components from "./plugins/components";
import VuePreferences from "vue-preferences";
import DialogPlugin from "./plugins/dialog";
import ToasterPlugin from "./plugins/toaster";
import { Teleport, TeleportTarget } from "./plugins/teleport";
import Plausible from "./plugins/plausible";

Vue.use(VuePreferences);

Vue.use(DialogPlugin);
Vue.use(ToasterPlugin);
Vue.component("teleport", Teleport);
Vue.component("teleport-target", TeleportTarget);

const should_use_production_api =
  process.env.NODE_ENV == "production" || process.env.NODE_ENV == "staging";

window.env = {
  ENV: process.env.NODE_ENV,
  PUBLIC_URL: should_use_production_api ? "" : `http://${location.host}:10006`,
  API_URL: should_use_production_api
    ? "/api/v1"
    : `http://${location.host.replace(/:.*/, "")}:10006/api/v1`,
};

import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

Vue.directive("tooltip", {
  // When the bound element is inserted into the DOM...
  inserted: function (el, { value }) {
    el.tooltip = new window.bootstrap.Tooltip(el, value);
  },
  update: function (el, { value }) {
    el.tooltip = new window.bootstrap.Tooltip(el, value);
  },
});

Vue.directive("validate", {
  inserted: function (el, fns) {
    el.addEventListener("input", (e) => {
      const val = e.target.value;
      if (!fns.every((f) => f(val))) {
        el.classList.remove("invalid");
      } else {
        el.classList.add("invalid");
      }
    });
  },
  update: function (el, fns) {
    el.addEventListener("input", (e) => {
      const val = e.target.value;
      if (!fns.every((f) => f(val))) {
        el.classList.remove("invalid");
      } else {
        el.classList.add("invalid");
      }
    });
  },
});

const chart_comments = {
  id: "comments",
  beforeDraw: function (chart, args, options) {
    const ctx = chart.ctx;

    const area = chart.chartArea;

    const isDesktop =
      getComputedStyle(document.documentElement).getPropertyValue(
        "--is-desktop",
      ) === "true";

    if (
      chart.scales.x._gridLineItems &&
      chart.scales.x._gridLineItems.length >= 2 &&
      chart.config.type == "line"
    ) {
      const max_width =
        chart.scales.x._gridLineItems[1]?.x1 ??
        2000 - chart.scales.x._gridLineItems[0].x1;

      for (let { index, color, comment, horizontal } of options) {
        if (horizontal) {
          const line_width = 3;

          const max = chart.scales.y.ticks.last().value;
          const ratio = index / max;
          // Centering the line is hard
          const y = ratio * (area.height - area.top) - line_width;
          console.log(ratio, y);

          ctx.strokeStyle = color ?? "rgb(91, 142, 125)";
          ctx.lineWidth = line_width;

          ctx.beginPath();
          ctx.moveTo(area.left, y);
          ctx.lineTo(area.right, y);
          ctx.closePath();
          ctx.stroke();

          return;
        }
        const _index = chart.data.labels.findIndex((e) => e == index);
        const datapoint = chart.scales.x._gridLineItems[_index];
        if (datapoint !== undefined && isDesktop) {
          ctx.strokeStyle = color ?? "rgb(91, 142, 125)";
          ctx.lineWidth = 3;

          ctx.beginPath();
          ctx.moveTo(datapoint.x1, area.bottom);
          ctx.lineTo(datapoint.x1, area.top);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = "rgb(91, 142, 125)";
          ctx.font = "16px Nunito";
          const text_metrics = ctx.measureText(comment);
          if (text_metrics.width > max_width) {
            ctx.font = "12px Nunito";
            const text_metrics = ctx.measureText(comment);
            if (text_metrics.width > max_width) {
              comment = comment.slice(0, 10) + "...";
            }
          }

          const [x, y] =
            _index === chart.scales.x._gridLineItems.length - 1
              ? [datapoint.x1 - 10 - text_metrics.width, area.bottom - 150]
              : [datapoint.x1 + 10, area.bottom - 50];
          ctx.fillText(comment, x, y);
        }
      }
    }
  },
  afterDraw: function (chart, args, options) {
    const ctx = chart.ctx;

    const area = chart.chartArea;
    const isDesktop =
      getComputedStyle(document.documentElement).getPropertyValue(
        "--is-desktop",
      ) === "true";

    if (
      chart.scales.x._gridLineItems &&
      chart.scales.x._gridLineItems.length >= 2 &&
      chart.config.type == "line"
    ) {
      const max_width =
        (chart.scales.x._gridLineItems[1]?.x1 ?? 2000) -
        chart.scales.x._gridLineItems[0].x1;

      for (let { index, comment } of options) {
        const _index = chart.data.labels.findIndex((e) => e == index);
        const datapoint = chart.scales.x._gridLineItems[_index];
        if (datapoint !== undefined && isDesktop) {
          ctx.fillStyle = "rgb(91, 142, 125)";
          ctx.font = "16px Nunito";
          const text_metrics = ctx.measureText(comment);
          if (text_metrics.width > max_width) {
            ctx.font = "12px Nunito";
            const text_metrics = ctx.measureText(comment);
            if (text_metrics.width > max_width) {
              comment = comment.slice(0, 10) + "...";
            }
          }

          const [x, y] =
            _index === chart.scales.x._gridLineItems.length - 1
              ? [datapoint.x1 - 10 - text_metrics.width, area.bottom - 150]
              : [datapoint.x1 + 10, area.bottom - 50];
          ctx.fillText(comment, x, y);
        }
      }
    }
  },
};

Chart.register(chart_comments);
// Chart.defaults.font = {
//   // family: "NunitoNunito",
// };

// import { formatDistanceToNow } from "date-fns";
// Vue.filter("distanceToNow", (val) =>
//   val ? formatDistanceToNow(new Date(val), { addSuffix: true }) : "never"
// );

Vue.config.productionTip = false;
Vue.use(components);
Vue.use(Plausible);

const vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);
document.documentElement.style.setProperty('--screen-height', `${window.innerHeight}px`);

new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");
