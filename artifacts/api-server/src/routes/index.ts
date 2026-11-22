import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogVideoRouter from "./catalog-video";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogVideoRouter);

router.use((err: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  if (typeof err === "object" && err !== null && "type" in err &&
      (err.type === "entity.too.large" || err.type === "encoding.unsupported")) {
    res.status(err.type === "entity.too.large" ? 413 : 415).json({ error: "The uploaded audio exceeds the demo limits or uses an unsupported encoding." });
    return;
  }
  next(err);
});

export default router;
