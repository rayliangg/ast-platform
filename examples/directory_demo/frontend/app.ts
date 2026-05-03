import path from "node:path";

import { helper } from "../shared/helper";

/** Base controller: shared run contract for the mini app. */
abstract class BaseController {
  protected abstract transform(input: string): string;

  run(input: string): string {
    const trimmed = input.trim();
    return this.transform(trimmed);
  }
}

/** Default greeting pipeline before the concrete app adds behavior. */
class DefaultController extends BaseController {
  protected transform(input: string): string {
    return helper(`default:${path.basename(input)}`);
  }
}

/** Main app: inherits default behavior and specializes the transform step. */
class AppController extends DefaultController {
  private readonly prefix: string;

  constructor(prefix: string) {
    super();
    this.prefix = prefix;
  }

  protected transform(input: string): string {
    const base = super.transform(input);
    return `${this.prefix}:${base}`;
  }

  /** Example of another method on the subclass. */
  describe(): string {
    return `AppController(${this.prefix})`;
  }
}

export { AppController, BaseController, DefaultController };
