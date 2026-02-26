/**
 * Mock Database - Simulates a PostgreSQL/MySQL DB with 500 users
 * Uses in-memory Map as source of truth.
 * Simulates realistic async latency (5-15ms).
 */

"use strict";

const { v4: uuidv4 } = require("uuid");

// ─── Deterministic Data Generation ────────────────────────────────────────────

const FIRST_NAMES = [
  "Alice", "Bob", "Carol", "David", "Eva", "Frank", "Grace", "Henry",
  "Iris", "Jack", "Karen", "Leo", "Maria", "Nathan", "Olivia", "Peter",
  "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander",
  "Yara", "Zach", "Ava", "Brian", "Clara", "Daniel", "Emma", "Felix",
  "Gina", "Hugo", "Isla", "James", "Kira", "Liam", "Maya", "Nora",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson",
];

const DEPARTMENTS = [
  "Engineering", "Marketing", "Sales", "HR", "Finance", "Operations",
  "Product", "Design", "Legal", "Customer Success",
];

const STATUSES = ["active", "inactive", "pending"];

const ROLES = ["admin", "manager", "engineer", "analyst", "designer", "intern"];

const CITIES = [
  "New York", "San Francisco", "Austin", "Seattle", "Chicago", "Boston",
  "Los Angeles", "Denver", "Miami", "Atlanta",
];

function seededRand(seed) {
  // Simple deterministic LCG
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function generateUser(index) {
  const rand = seededRand(index * 31337);
  const firstName = pick(FIRST_NAMES, rand);
  const lastName = pick(LAST_NAMES, rand);
  const dept = pick(DEPARTMENTS, rand);
  const status = pick(STATUSES, rand);
  const role = pick(ROLES, rand);
  const city = pick(CITIES, rand);
  const salary = 40000 + Math.floor(rand() * 120000);
  const age = 22 + Math.floor(rand() * 38);
  const year = 2018 + Math.floor(rand() * 6);
  const month = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
  const joinedAt = `${year}-${month}-${day}`;

  return {
    id: `user_${String(index).padStart(4, "0")}`,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@company.com`,
    department: dept,
    role,
    status,
    city,
    salary,
    age,
    joinedAt,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Seed the DB ──────────────────────────────────────────────────────────────

const DB_SIZE = 500;

/** @type {Map<string, object>} */
const store = new Map();

for (let i = 1; i <= DB_SIZE; i++) {
  const user = generateUser(i);
  store.set(user.id, user);
}

// ─── Simulated DB Latency ─────────────────────────────────────────────────────

function simulateLatency() {
  const ms = 5 + Math.floor(Math.random() * 11); // 5–15 ms
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── DB API ───────────────────────────────────────────────────────────────────

/**
 * Returns all users (sorted by id).
 * @returns {Promise<object[]>}
 */
async function findAll() {
  await simulateLatency();
  return Array.from(store.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Returns a single user by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  await simulateLatency();
  return store.get(id) ?? null;
}

/**
 * Updates a user in the DB. Returns the updated user.
 * @param {string} id
 * @param {object} patch
 * @returns {Promise<object|null>}
 */
async function update(id, patch) {
  await simulateLatency();
  const existing = store.get(id);
  if (!existing) return null;

  // Whitelist updatable fields
  const allowed = ["firstName", "lastName", "email", "department", "role", "status", "city", "salary", "age"];
  const updated = { ...existing };

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      updated[key] = patch[key];
    }
  }

  updated.name = `${updated.firstName} ${updated.lastName}`;
  updated.updatedAt = new Date().toISOString();

  store.set(id, updated);
  return updated;
}

/**
 * Returns DB size.
 */
function size() {
  return store.size;
}

module.exports = { findAll, findById, update, size };
