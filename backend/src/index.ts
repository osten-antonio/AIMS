import 'dotenv/config'
import express, { type Application, type Request, type Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import ingestionRouter from "./routes/ingestion.routes";
import solverRouter from "./routes/solver.routes";
import explanationRouter from "./routes/explanation.routes";
import practiceRouter from "./routes/practice.routes";
import userRouter from "./routes/user.routes";
import statisticsRouter from "./routes/statistics.routes";
import path from 'path';
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

// Zod schemas
import * as z from 'zod';
import { ingestionText, ingestionImage, ingestionResponse } from "./schemas/ingestion.schema";
import { solveRequest, solveResponse } from "./schemas/solve.schema";
import { stepsRequest, stepsResponse, hintResponse, explanationRequest, explanationResponse, followUpRequest } from "./schemas/explanation.schema";
import { practiceRequest, practiceResponse, practiceRefresh } from "./schemas/practice.schema";
import { userAccountSchema, updateUsernameRequest, forgotPasswordRequest, changePasswordRequest, historyFilterRequest, deleteHistoryRequest, problemSubmissionSchema, historyResponse, deleteHistoryResponse, profileResponse } from "./schemas/user.schema";
import { ErrorResponse } from "./schemas/error.schema";
import * as statisticsSchema from "./schemas/statistics.schema";


const app: Application = express();
const port = parseInt(process.env.BACKEND_PORT ?? '8000', 10);

// Configure hostnames and origins (can be provided via env)
const frontendProtocol = process.env.FRONTEND_PROTOCOL ?? 'http';
const frontendHostname = process.env.FRONTEND_HOSTNAME ?? 'localhost';
const frontendPort = process.env.FRONTEND_PORT ?? '3000';
const allowedOrigin = `${frontendProtocol}://${frontendHostname}${frontendPort ? `:${frontendPort}` : ''}`;

const _backendProtocol = process.env.BACKEND_PROTOCOL ?? 'http';
const _backendHostname = process.env.BACKEND_HOSTNAME ?? 'localhost';
const _backendPort = process.env.BACKEND_PORT ?? '8000';

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WADS-FP Calculator',
      version: '1.0.0',
    },
    servers: [
      {url:'/api'} // proxy to frontend
      // { url: `${backendProtocol}://${backendHostname}:${backendPort}` }
    ],
    components: {
      schemas: {
        // Ingestion
        ingestionImage: z.toJSONSchema(ingestionImage),
        ingestionText: z.toJSONSchema(ingestionText),
        ingestionResponse: z.toJSONSchema(ingestionResponse),

        // Solver
        solveRequest: z.toJSONSchema(solveRequest),
        solveResponse: z.toJSONSchema(solveResponse),

        // Explanation
        stepsRequest: z.toJSONSchema(stepsRequest),
        stepsResponse: z.toJSONSchema(stepsResponse),
        hintResponse: z.toJSONSchema(hintResponse),
        explanationRequest: z.toJSONSchema(explanationRequest),
        explanationResponse: z.toJSONSchema(explanationResponse),
        followUpRequest: z.toJSONSchema(followUpRequest),

        // Practice
        practiceRequest: z.toJSONSchema(practiceRequest),
        practiceResponse: z.toJSONSchema(practiceResponse),
        practiceRefresh: z.toJSONSchema(practiceRefresh),

        // User
        userAccountSchema: z.toJSONSchema(userAccountSchema),
        updateUsernameRequest: z.toJSONSchema(updateUsernameRequest),
        forgotPasswordRequest: z.toJSONSchema(forgotPasswordRequest),
        changePasswordRequest: z.toJSONSchema(changePasswordRequest),
        historyFilterRequest: z.toJSONSchema(historyFilterRequest),
        deleteHistoryRequest: z.toJSONSchema(deleteHistoryRequest),
        problemSubmissionSchema: z.toJSONSchema(problemSubmissionSchema),
        historyResponse: z.toJSONSchema(historyResponse),
        deleteHistoryResponse: z.toJSONSchema(deleteHistoryResponse),
        profileResponse: z.toJSONSchema(profileResponse),

        // Statistics
        statisticsResponse: z.toJSONSchema(statisticsSchema.statisticsResponse),
        binomialRangeRequest: z.toJSONSchema(statisticsSchema.binomialRangeRequest),
        poissonRangeRequest: z.toJSONSchema(statisticsSchema.poissonRangeRequest),
        hypergeometricRequest: z.toJSONSchema(statisticsSchema.hypergeometricRequest),
        countingRequest: z.toJSONSchema(statisticsSchema.countingRequest),
        oneSampleTTestRequest: z.toJSONSchema(statisticsSchema.oneSampleTTestRequest),
        pairedTTestRequest: z.toJSONSchema(statisticsSchema.pairedTTestRequest),
        independentTTestDataRequest: z.toJSONSchema(statisticsSchema.independentTTestDataRequest),
        independentTTestStatsRequest: z.toJSONSchema(statisticsSchema.independentTTestStatsRequest),
        goodnessOfFitRequest: z.toJSONSchema(statisticsSchema.goodnessOfFitRequest),
        chiSquareIndependenceRequest: z.toJSONSchema(statisticsSchema.chiSquareIndependenceRequest),
        oneWayAnovaRequest: z.toJSONSchema(statisticsSchema.oneWayAnovaRequest),
        twoWayAnovaRequest: z.toJSONSchema(statisticsSchema.twoWayAnovaRequest),
        descriptiveStatsRequest: z.toJSONSchema(statisticsSchema.descriptiveStatsRequest),
        linearRegressionRequest: z.toJSONSchema(statisticsSchema.linearRegressionRequest),
        boxPlotRequest: z.toJSONSchema(statisticsSchema.boxPlotRequest),
        specialMeansRequest: z.toJSONSchema(statisticsSchema.specialMeansRequest),

        // Error
        ErrorResponse: z.toJSONSchema(ErrorResponse),
      }
    }
  },
    apis: [
      path.join(__dirname, './routes/*.ts'), // ts-node / tsx dev
      path.join(__dirname, './routes/*.js'), // compiled output
      path.join(__dirname, './index.ts'),
      path.join(__dirname, './index.js'),
  ],
};


const openapiSpecification = swaggerJsdoc(options);

app.use('/', swaggerUi.serve);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(null,{
  swaggerOptions: {
    url: '/api/spec'
  }
}));

// Register API routes
app.use('/ingestion', ingestionRouter);
app.use('/solver', solverRouter);
app.use('/explanation', explanationRouter);
app.use('/practice', practiceRouter);
app.use('/user', userRouter);
app.use('/statistics', statisticsRouter);


app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to Express & TypeScript Server');
});

app.get('/openapi.json', (req: Request, res: Response) => {
  res.json(openapiSpecification);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
