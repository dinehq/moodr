import { prisma } from "../lib/prisma";

interface TableSize {
  table_name: string;
  total_size: string;
  table_size: string;
  index_size: string;
  row_count: number;
}

interface DbSize {
  total_size: string;
}

interface DateCount {
  day: Date;
  vote_count?: number;
  view_count?: number;
}

interface ProjectStats {
  project_name: string;
  image_count: number;
  total_url_size: string;
}

async function analyzeDatabase() {
  try {
    // Get table sizes and row counts
    const tableSizes = await prisma.$queryRaw<TableSize[]>`
      SELECT
        table_name,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
        pg_size_pretty(pg_table_size(quote_ident(table_name))) as table_size,
        pg_size_pretty(pg_indexes_size(quote_ident(table_name))) as index_size,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = table_name) as row_count
      FROM (
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      ) AS tables
      ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
    `;

    console.log("\nDatabase Table Analysis:");
    console.log("=======================");
    console.table(tableSizes);

    // Get database total size
    const [dbSize] = await prisma.$queryRaw<DbSize[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;
    `;
    console.log("\nTotal Database Size:", dbSize.total_size);

    // Get the largest values in each table
    console.log("\nLargest Values Analysis:");
    console.log("=======================");

    // Analyze Vote table distribution
    const voteStats = await prisma.$queryRaw<DateCount[]>`
      SELECT
        date_trunc('day', "createdAt") as day,
        COUNT(*) as vote_count
      FROM "Vote"
      GROUP BY day
      ORDER BY vote_count DESC
      LIMIT 5;
    `;
    console.log("\nDays with Most Votes:");
    console.table(voteStats);

    // Analyze PageView table distribution
    const pageViewStats = await prisma.$queryRaw<DateCount[]>`
      SELECT
        date_trunc('day', "viewedAt") as day,
        COUNT(*) as view_count
      FROM "PageView"
      GROUP BY day
      ORDER BY view_count DESC
      LIMIT 5;
    `;
    console.log("\nDays with Most Page Views:");
    console.table(pageViewStats);

    // Get projects with most images
    const projectStats = await prisma.$queryRaw<ProjectStats[]>`
      SELECT
        p.name as project_name,
        COUNT(i.id) as image_count,
        pg_size_pretty(SUM(LENGTH(i.url))) as total_url_size
      FROM "Project" p
      LEFT JOIN "Image" i ON p.id = i."projectId"
      GROUP BY p.id, p.name
      ORDER BY COUNT(i.id) DESC
      LIMIT 5;
    `;
    console.log("\nProjects with Most Images:");
    console.table(projectStats);
  } catch (error) {
    console.error("Error analyzing database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase();
