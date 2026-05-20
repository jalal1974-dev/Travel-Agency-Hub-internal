import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import pagesRouter from "./pages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pagesRouter);

export default router;
