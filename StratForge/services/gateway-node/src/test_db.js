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
var DatabaseService_js_1 = require("./services/DatabaseService.js");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function runTest() {
    return __awaiter(this, void 0, void 0, function () {
        var strategy, session, isActive, stoppedSession, isActiveAfter;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Starting DB Integration Test...");
                    return [4 /*yield*/, prisma.strategies.findFirst({
                            where: { name: 'AAPL Momentum' }
                        })];
                case 1:
                    strategy = _a.sent();
                    if (!strategy) {
                        console.error("Strategy 'AAPL Momentum' not found. Did you run seed_db.ts?");
                        process.exit(1);
                    }
                    console.log("Found Strategy: ".concat(strategy.name, " (").concat(strategy.id, ")"));
                    // 2. Create Session
                    console.log("Creating Session...");
                    return [4 /*yield*/, DatabaseService_js_1.databaseService.createSession({
                            symbol: 'AAPL',
                            type: 'stock',
                            strategyId: strategy.id
                        })];
                case 2:
                    session = _a.sent();
                    console.log("Created Session: ".concat(session.id, " Status: ").concat(session.status));
                    if (session.status !== 'RUNNING') {
                        throw new Error("Expected RUNNING, got ".concat(session.status));
                    }
                    return [4 /*yield*/, DatabaseService_js_1.databaseService.hasActiveSessionsForSymbol('AAPL')];
                case 3:
                    isActive = _a.sent();
                    console.log("Is AAPL Active? ".concat(isActive));
                    if (!isActive)
                        throw new Error("Expected AAPL to be active");
                    // 4. Stop Session
                    console.log("Stopping Session...");
                    return [4 /*yield*/, DatabaseService_js_1.databaseService.stopSession(session.id)];
                case 4:
                    stoppedSession = _a.sent();
                    console.log("Stopped Session: ".concat(stoppedSession === null || stoppedSession === void 0 ? void 0 : stoppedSession.id, " Status: ").concat(stoppedSession === null || stoppedSession === void 0 ? void 0 : stoppedSession.status));
                    if ((stoppedSession === null || stoppedSession === void 0 ? void 0 : stoppedSession.status) !== 'STOPPED') {
                        throw new Error("Expected STOPPED, got ".concat(stoppedSession === null || stoppedSession === void 0 ? void 0 : stoppedSession.status));
                    }
                    return [4 /*yield*/, DatabaseService_js_1.databaseService.hasActiveSessionsForSymbol('AAPL')];
                case 5:
                    isActiveAfter = _a.sent();
                    console.log("Is AAPL Active After Stop? ".concat(isActiveAfter));
                    console.log("Test Passed!");
                    return [2 /*return*/];
            }
        });
    });
}
runTest()
    .catch(console.error)
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, prisma.$disconnect()];
        case 1: return [2 /*return*/, _a.sent()];
    }
}); }); });
