import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for Telegram bot messages (they're not HTTP requests)
    try {
      const request = context.switchToHttp().getRequest();
      if (!request || !request.headers) {
        // This is likely a Telegram message, not an HTTP request
        return true;
      }
      return super.canActivate(context) as Promise<boolean>;
    } catch {
      // If we can't get the request, allow it (likely Telegram message)
      return true;
    }
  }
}

