import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================
// EMPLOYEES
// ============================================
export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  externalId: text('external_id'),          // ID in Aplano
  name: text('name').notNull(),
  email: text('email'),
  role: text('role'),                        // RT, Arzt, Sekretariat, MTRA
  qualifications: text('qualifications'),    // JSON array
  maxHoursPerWeek: real('max_hours_per_week').default(40),
  minRestHours: real('min_rest_hours').default(11), // AZG default
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================
// JOB POSITIONS (Rollen)
// ============================================
export const jobPositions = sqliteTable('job_positions', {
  id: text('id').primaryKey(),
  externalId: text('external_id'),
  name: text('name').notNull(),
  color: text('color'),
  shorthand: text('shorthand'),
});

// ============================================
// SHIFTS
// ============================================
export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey(),
  externalId: text('external_id'),
  date: text('date').notNull(),              // YYYY-MM-DD
  startTime: text('start_time').notNull(),   // HH:mm
  endTime: text('end_time').notNull(),       // HH:mm
  breakMinutes: integer('break_minutes').default(30),
  employeeId: text('employee_id').references(() => employees.id),
  jobPositionId: text('job_position_id').references(() => jobPositions.id),
  status: text('status').default('draft'),   // draft, planned, published
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================
// SHIFT REQUIREMENTS (Personalbedarf)
// ============================================
export const shiftRequirements = sqliteTable('shift_requirements', {
  id: text('id').primaryKey(),
  externalId: text('external_id'),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  jobPositionId: text('job_position_id').references(() => jobPositions.id),
  requiredCount: integer('required_count').default(1),
  comment: text('comment'),
});

// ============================================
// ABSENCES (Urlaub, Krankheit)
// ============================================
export const absences = sqliteTable('absences', {
  id: text('id').primaryKey(),
  externalId: text('external_id'),
  employeeId: text('employee_id').references(() => employees.id).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  type: text('type').notNull(),              // vacation, illness, unpaidVacation
  status: text('status').default('active'),  // requested, active
});

// ============================================
// GENERATED PLANS
// ============================================
export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  month: text('month').notNull(),            // YYYY-MM
  status: text('status').default('draft'),   // draft, approved, published
  generatedAt: integer('generated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  shiftsJson: text('shifts_json'),           // JSON of generated shifts
  complianceScore: real('compliance_score'), // 0-100
  notes: text('notes'),
});

// ============================================
// AI LEARNING MEMORY
// ============================================
export const learningMemory = sqliteTable('learning_memory', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),              // correction, preference, pattern
  context: text('context').notNull(),        // JSON context
  learning: text('learning').notNull(),      // What the AI learned
  weight: real('weight').default(1.0),       // Importance weight
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============================================
// DAILY REQUIREMENTS CONFIG
// ============================================
export const dailyRequirements = sqliteTable('daily_requirements', {
  id: text('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 1=Monday, etc.
  jobPositionId: text('job_position_id').references(() => jobPositions.id),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  minStaff: integer('min_staff').default(1),
  optimalStaff: integer('optimal_staff').default(1),
});
