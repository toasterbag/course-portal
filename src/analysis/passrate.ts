import { Electivity, PrismaClient } from "@prisma/client";

export interface HST {
  total: number;
  passed: number;
}
export class Result {
  // points: number;

  failed: number;

  threes: number;

  fours: number;

  fives: number;

  constructor(failed: number, threes: number, fours: number, fives: number) {
    // this.points = points;
    this.failed = failed;
    this.threes = threes;
    this.fours = fours;
    this.fives = fives;
  }

  combine(other: Result) {
    const failed = this.failed + other.failed;
    const threes = this.threes + other.threes;
    const fours = this.fours + other.fours;
    const fives = this.fives + other.fives;
    return new Result(failed, threes, fours, fives);
  }

  // join(other: Result) {
  //   const total_points = this.points + other.points;
  //   const this_frac = this.points / total_points;
  //   const other_frac = other.points / total_points;
  //   const failed =
  //     (this.failed * this_frac + other.failed * other_frac) * total_points;
  //   const threes =
  //     (this.threes * this_frac + other.threes * other_frac) * total_points;
  //   const fours =
  //     (this.fours * this_frac + other.fours * other_frac) * total_points;
  //   const fives =
  //     (this.fives * this_frac + other.fives * other_frac) * total_points;
  //   return new Result(total_points, failed, threes, fours, fives);
  // }

  get percent_failed() {
    return this.failed / this.total;
  }

  get percent_passed() {
    return this.passed / this.total;
  }

  get passed() {
    return this.threes + this.fours + this.fives;
  }

  get total() {
    return this.failed + this.passed;
  }

  // get passed_hst() {
  //   return this.passed * this.points;
  // }

  // get failed_hst() {
  //   return this.failed * this.points;
  // }

  // get total_hst() {
  //   return this.total * this.points;
  // }
}

export const passrate_for_programme = async (
  prisma: PrismaClient,
  programme_code: string,
  start_period: number,
  end_period: number,
  grade: number,
  assessment_kind: string | undefined,
): Promise<Map<string, { result: Result; hst: HST } | undefined>> => {
  // const where: Where = {};
  // if ("programme_codes" in params) {
  //   where.programme_code = {
  //     in: params.programme_codes,
  //   };
  // } else if ("programme_category" in params) {
  //   where.programme_code = {
  //     startsWith: params.programme_category,
  //   };
  // }

  const data = await prisma.programmePlanEntry.findMany({
    where: {
      programme_code,
      grade,
      electivity: Electivity.Compulsory,
      course_instance: {
        start_period: {
          equals: start_period,
        },
        end_period: {
          equals: end_period,
        },
      },
    },
    select: {
      course_code: true,
      programme_instance: true,
      course_instance: {
        select: {
          modules: {
            select: {
              module_id: true,
              kind: true,
            },
          },
        },
      },
    },
  });

  const normalized = data.map((entry) => ({
    admission_year: entry.programme_instance.admission_year,
    programme_code: entry.programme_instance.programme_code,
    course_code: entry.course_code,
    modules:
      assessment_kind !== undefined
        ? // Filter out certain kinds of exams
          entry.course_instance.modules.filter(
            (mod) => mod.kind === assessment_kind,
          )
        : entry.course_instance.modules,
  }));

  const t1 = normalized.map(async (entry) => ({
    ...entry,
    results: await Promise.all(
      entry.modules.map((module) =>
        prisma.moduleResult.findMany({
          where: {
            module_id: module.module_id,
            course_code: entry.course_code,
            academic_year: entry.admission_year,
          },
        }),
      ),
    ),
  }));

  const t2 = (await Promise.all(t1)).groupBy((e) => e.admission_year);

  const t3 = Object.entries(t2)
    .map(([admission_year, courses]) => ({
      admission_year,
      result: courses
        .map((c) => c.results)
        .flat()
        .flat()
        .map((e) => new Result(e.failed, e.three, e.four, e.five))
        .reduce((a, b) => a.combine(b), new Result(0, 0, 0, 0)),
      hst: courses
        .map((c) => c.results)
        .flat()
        .flat()
        .map((e) => ({
          total: e.points,
          passed:
            e.points *
            new Result(e.failed, e.three, e.four, e.five).percent_passed,
        }))
        .reduce(
          (a, b) => ({
            total: a.total + b.total,
            passed: a.passed + b.passed,
          }),
          { total: 0, passed: 0 },
        ),
    }))
    .sortBy((a, b) => a.admission_year.localeCompare(b.admission_year))
    .filter((x) => x.result.total !== 0)
    .reduce((map, { admission_year, result, hst }) => {
      map.set(admission_year, { result, hst });
      return map;
    }, new Map());

  return t3;
};

export interface PassthroughFilter {
  assessment_kind?: string;
  programme_category?: string;
  programmes?: Array<string>;
  grade: number;
  start_period: number;
  end_period: number;
}

export const passrate_for_category = async (
  prisma: PrismaClient,
  filters: PassthroughFilter,
) => {
  const programmes = await prisma.programmeInstance.findMany({
    select: {
      programme_code: true,
    },
    where: {
      admission_year: "2021/2022",
      programme_code: {
        contains: filters?.programme_category,
        in: filters?.programmes,
      },
    },
  });
  const t1 = await Promise.all(
    programmes
      .map((e) => e.programme_code)
      .map(async (code) => ({
        label: code,
        result: await passrate_for_programme(
          prisma,
          code,
          filters.start_period,
          filters.end_period,
          filters.grade,
          filters.assessment_kind,
        ),
      })),
  );
  // console.log(t1);
  const years = t1
    .flatMap((e) => Array.from(e.result.keys()))
    .sortBy((a, b) => a.localeCompare(b))
    .unique();

  for (const p of t1) {
    for (const key of years) {
      if (!p.result.has(key)) p.result.set(key, undefined);
    }
  }

  const total = t1
    .map((e) => e.result)
    .reduce((map, programme) => {
      for (const [key, val] of programme.entries()) {
        if (!map.has(key))
          map.set(key, {
            result: new Result(0, 0, 0, 0),
            hst: { total: 0, passed: 0 },
          });
        const next = map.get(key);
        if (val !== undefined && next !== undefined) {
          map.set(key, {
            result: next.result.combine(val.result),
            hst: {
              total: next.hst.total + val.hst.total,
              passed: next.hst.passed + val.hst.passed,
            },
          });
        }
      }
      return map;
    }, new Map<string, { result: Result; hst: HST }>());
  t1.push({
    label: "Average",
    result: total,
  });

  const data = t1.map((p) => ({
    label: p.label,
    data: Array.from(p.result.entries())
      .sortBy(([a], [b]) => a.localeCompare(b))
      .map(([, x]) => x)
      .map((r) =>
        r !== undefined
          ? { result: r.result.percent_passed, hst: r.hst.passed / r.hst.total }
          : r,
      ),
  }));

  return { labels: years, data };
};
