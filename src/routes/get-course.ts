import { and, asc, ilike, SQL } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";
import { db } from "../database/client.ts";
import { courses } from "../database/schema.ts";

export const getCoursesRoute: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/courses",
    {
      schema: {
        tags: ["courses"],
        summary: "Get all courses",
        querystring: z.object({
          search: z.string().optional(),
          orderBy: z.enum(["id", "title"]).optional().default("id"),
          page: z.coerce.number().optional().default(1),
        }),
        response: {
          200: z.object({
            courses: z.array(
              z.object({
                id: z.uuid(),
                title: z.string(),
                description: z.string().nullable(),
              })
            ),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { search, orderBy, page } = request.query;

      const conditions: SQL[] = [];

      if (search) {
        conditions.push(ilike(courses.title, `%${search}%`));
      }

      const [result, total] = await Promise.all([
        db
          .select()
          .from(courses)
          .orderBy(asc(courses[orderBy]))
          .offset((page - 1) * 2)
          .limit(2)
          .where(and(...conditions)),
        db.$count(courses, and(...conditions)),
      ]);

      return reply.send({ courses: result, total });
    }
  );
};
