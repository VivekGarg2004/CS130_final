"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = void 0;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
exports.databaseService = {
    createSession: function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var strategy, session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.strategies.findUnique({
                            where: { id: data.strategyId }
                        })];
                    case 1:
                        strategy = _a.sent();
                        if (!strategy) {
                            // Fallback for testing if strategy doesn't exist in DB yet (Development convenience)
                            // In strict mode, we should throw error.
                            console.warn("[DB] Strategy ".concat(data.strategyId, " not found. Creating mock strategy for testing."));
                            // Create a dummy user if needed? Schema requires user_id.
                            // This is getting complicated for a quick "wire up".
                            // Let's assume the user has run migration seeds or we fail.
                            throw new Error("Strategy ".concat(data.strategyId, " not found"));
                        }
                        return [4 /*yield*/, prisma.sessions.create({
                                data: {
                                    strategy_id: data.strategyId,
                                    mode: 'LIVE', // Defaulting to LIVE for now
                                    status: 'RUNNING',
                                    started_at: new Date()
                                },
                                include: {
                                    strategies: true // Include strategy to get symbol back
                                }
                            })];
                    case 2:
                        session = _a.sent();
                        console.log("[DB] Created Session: ".concat(session.id, " for ").concat(session.strategies.symbol));
                        return [2 /*return*/, {
                                id: session.id,
                                symbol: session.strategies.symbol,
                                type: 'stock', // Schema doesn't have type in Session, defaulting.
                                strategyId: session.strategy_id,
                                status: session.status,
                                createdAt: session.started_at
                            }];
                }
            });
        });
    },
    stopSession: function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, prisma.sessions.update({
                                where: { id: sessionId },
                                data: {
                                    status: 'STOPPED',
                                    ended_at: new Date()
                                },
                                include: {
                                    strategies: true
                                }
                            })];
                    case 1:
                        session = _a.sent();
                        console.log("[DB] Stopped Session: ".concat(sessionId));
                        return [2 /*return*/, {
                                id: session.id,
                                symbol: session.strategies.symbol,
                                type: 'stock',
                                strategyId: session.strategy_id,
                                status: session.status,
                                createdAt: session.started_at
                            }];
                    case 2:
                        error_1 = _a.sent();
                        console.error("[DB] Failed to stop session ".concat(sessionId, ":"), error_1);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    },
    hasActiveSessionsForSymbol: function (symbol) {
        return __awaiter(this, void 0, void 0, function () {
            var count;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.sessions.count({
                            where: {
                                status: 'RUNNING',
                                strategies: {
                                    symbol: symbol
                                }
                            }
                        })];
                    case 1:
                        count = _a.sent();
                        return [2 /*return*/, count > 0];
                }
            });
        });
    },
    // Helper to get raw prisma client if needed
    getClient: function () {
        return prisma;
    }
};
