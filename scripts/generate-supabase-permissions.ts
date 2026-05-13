import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type PermissionConfig = {
  schema?: string;
  publicContentTables?: string[];
  businessTables?: string[];
};

type PrismaModel = {
  modelName: string;
  tableName: string;
};

const repoRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(repoRoot, "prisma", "schema.prisma");
const configPath = path.join(repoRoot, "prisma", "supabase", "data-api-permissions.json");
const outputPath = path.join(repoRoot, "prisma", "supabase", "public-schema-permissions.sql");

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function parsePrismaModels(schema: string): PrismaModel[] {
  const models: PrismaModel[] = [];
  const modelPattern = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelPattern.exec(schema)) !== null) {
    const [, modelName, body] = match;
    const mappedName = body.match(/@@map\("([^"]+)"\)/)?.[1];
    models.push({
      modelName,
      tableName: mappedName ?? modelName,
    });
  }

  return models;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function policyIdentifier(prefix: string, tableName: string) {
  const normalizedTable = tableName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return quoteIdentifier(`${prefix}_${normalizedTable}`.slice(0, 63));
}

function tableReference(schemaName: string, tableName: string) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

function validateConfig(models: PrismaModel[], config: PermissionConfig) {
  const modelNames = new Set(models.map((model) => model.modelName));
  const publicTables = new Set(config.publicContentTables ?? []);
  const businessTables = new Set(config.businessTables ?? []);
  const errors: string[] = [];

  for (const table of publicTables) {
    if (!modelNames.has(table)) {
      errors.push(`Unknown publicContentTables entry: ${table}`);
    }
  }

  for (const table of businessTables) {
    if (!modelNames.has(table)) {
      errors.push(`Unknown businessTables entry: ${table}`);
    }
  }

  for (const model of models) {
    const isPublic = publicTables.has(model.modelName);
    const isBusiness = businessTables.has(model.modelName);

    if (isPublic && isBusiness) {
      errors.push(`${model.modelName} is listed as both public content and business data.`);
    }

    if (!isPublic && !isBusiness) {
      errors.push(
        `${model.modelName} is not classified. Add it to publicContentTables or businessTables in ${path.relative(
          repoRoot,
          configPath,
        )}.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function buildPublicContentSql(model: PrismaModel, schemaName: string) {
  const table = tableReference(schemaName, model.tableName);
  const anonPolicy = policyIdentifier("anon_select_public", model.tableName);
  const authenticatedPolicy = policyIdentifier("authenticated_select_public", model.tableName);
  const serviceRolePolicy = policyIdentifier("service_role_all", model.tableName);

  return [
    `-- ${model.modelName}: public-facing content. Anon/authenticated Data API clients may read only.`,
    `revoke all on table ${table} from public;`,
    `revoke all on table ${table} from anon;`,
    `revoke all on table ${table} from authenticated;`,
    `grant select on table ${table} to anon;`,
    `grant select, insert, update, delete on table ${table} to authenticated;`,
    `grant select, insert, update, delete on table ${table} to service_role;`,
    `alter table ${table} enable row level security;`,
    `drop policy if exists ${anonPolicy} on ${table};`,
    `create policy ${anonPolicy}`,
    `on ${table}`,
    `as permissive`,
    `for select`,
    `to anon`,
    `using (true);`,
    `drop policy if exists ${authenticatedPolicy} on ${table};`,
    `create policy ${authenticatedPolicy}`,
    `on ${table}`,
    `as permissive`,
    `for select`,
    `to authenticated`,
    `using (true);`,
    `drop policy if exists ${serviceRolePolicy} on ${table};`,
    `create policy ${serviceRolePolicy}`,
    `on ${table}`,
    `as permissive`,
    `for all`,
    `to service_role`,
    `using (true)`,
    `with check (true);`,
  ].join("\n");
}

function buildBusinessSql(model: PrismaModel, schemaName: string) {
  const table = tableReference(schemaName, model.tableName);
  const serviceRolePolicy = policyIdentifier("service_role_all", model.tableName);

  return [
    `-- ${model.modelName}: ERP/business data. No anon Data API access; authenticated is denied by RLS until row-scoped policies are added.`,
    `revoke all on table ${table} from public;`,
    `revoke all on table ${table} from anon;`,
    `revoke all on table ${table} from authenticated;`,
    `grant select, insert, update, delete on table ${table} to authenticated;`,
    `grant select, insert, update, delete on table ${table} to service_role;`,
    `alter table ${table} enable row level security;`,
    `drop policy if exists ${serviceRolePolicy} on ${table};`,
    `create policy ${serviceRolePolicy}`,
    `on ${table}`,
    `as permissive`,
    `for all`,
    `to service_role`,
    `using (true)`,
    `with check (true);`,
  ].join("\n");
}

function generateSql() {
  const schema = readFileSync(schemaPath, "utf8");
  const config = readJson<PermissionConfig>(configPath);
  const models = parsePrismaModels(schema);
  const schemaName = config.schema ?? "public";
  const publicTables = new Set(config.publicContentTables ?? []);

  validateConfig(models, config);

  const blocks = models.map((model) =>
    publicTables.has(model.modelName)
      ? buildPublicContentSql(model, schemaName)
      : buildBusinessSql(model, schemaName),
  );

  return [
    "-- Generated by scripts/generate-supabase-permissions.ts. Do not edit by hand.",
    "-- Regenerate with: npm run db:permissions:generate",
    "--",
    "-- Supabase Data API hardening:",
    "-- - every public-schema Prisma table gets explicit grants",
    "-- - RLS is enabled on every table",
    "-- - public content allows anon SELECT only",
    "-- - ERP/business tables deny anon and authenticated row access until a scoped policy exists",
    "",
    "begin;",
    "",
    `revoke all on schema ${quoteIdentifier(schemaName)} from public;`,
    `grant usage on schema ${quoteIdentifier(schemaName)} to anon, authenticated, service_role;`,
    "",
    blocks.join("\n\n"),
    "",
    "commit;",
    "",
  ].join("\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const sql = generateSql();

  if (args.has("--check")) {
    if (!existsSync(outputPath)) {
      throw new Error(`${path.relative(repoRoot, outputPath)} does not exist. Run npm run db:permissions:generate.`);
    }

    const current = readFileSync(outputPath, "utf8");
    if (current !== sql) {
      throw new Error(
        `${path.relative(repoRoot, outputPath)} is out of date. Run npm run db:permissions:generate.`,
      );
    }

    console.log("Supabase Data API permissions are up to date.");
    return;
  }

  if (args.has("--write")) {
    writeFileSync(outputPath, sql);
    console.log(`Wrote ${path.relative(repoRoot, outputPath)}.`);
    return;
  }

  process.stdout.write(sql);
}

main();
