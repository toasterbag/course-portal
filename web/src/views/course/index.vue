<template lang="pug">
div(v-if="this.ready")
  .row.justify-content-between.desktop-only
    .py-3
      .fs-4
        span.bold {{ course.course_code }}
        | &nbsp;
        span {{ course.name_en }}
        .fst-italic {{ course.name_sv }}
      div
        span.pe-2 Owner:&nbsp;
          span.fw-bold {{ course.owner_code }}
        span.pe-2
          a(
            target="_blank",
            :href="`https://student.portal.chalmers.se/sv/chalmersstudier/minkursinformation/Sidor/SokKurs.aspx?course_id=${course.instances[0].study_portal_id}&parsergrp=3`"
          )
            i.fa.fa-home.pe-1
            | View on the student portal

  .row.justify-content-between.mobile-only
    .py-3
      .fs-6
        span {{ course.name_en }}
        .fst-italic {{ course.name_sv }}
      .py-2
        .d-flex.justify-items-between
          .pe-2 Course code:&nbsp;
            span.fw-bold {{ course.course_code }}
          .pe-2 Owner:&nbsp;
            span.fw-bold {{ course.owner_code }}
        .py-2
          a(
            target="_blank",
            :href="`https://student.portal.chalmers.se/sv/chalmersstudier/minkursinformation/Sidor/SokKurs.aspx?course_id=${course.instances[0].study_portal_id}&parsergrp=3`"
          )
            i.fa.fa-home.pe-1
            | View on the student portal

  .pt-2.pb-4
    tabs(:entries="nav_items")

  .row
    transition(name="fade", mode="out-in", :key="$router.fullPath")
      router-view
</template>

<script>
import Http from "../../plugins/http";

export default {
  name: "course",
  data: () => ({
    ready: false,
    nav_items: [
      {
        title: "Exam statistics",
        route: "course/exam-statistics",
      },
      {
        title: "Exams & solutions",
        route: "course/materials",
      },
      {
        title: "Survey Analysis",
        route: "course/survey-analysis",
      },
      {
        title: "Surveys & minutes",
        route: "course/surveys",
      },
    ],

    course: {
      name_sv: undefined,
      name_en: undefined,
      course_code: undefined,
      owner_code: undefined,
      instances: [],
    },
  }),

  created() {
    this.loadCourse();
  },

  beforeRouteUpdate(to, from, next) {
    if (to.name.startsWith("course/")) {
      setTimeout(() => {
        this.loadCourse();
      }, 20);
    }
    next();
  },

  methods: {
    async loadCourse() {
      let res = await Http.get(`course/${this.$route.params.code}`);
      this.course = res;
      this.ready = true;
      Http.log("course", this.$route.params.code);
    },
  },
};
</script>

<style lang="scss" scoped></style>
