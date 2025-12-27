import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare module 'express' {
  interface Request {
    isMobile: boolean;
  }
}

@Injectable()
export class DeviceDetectorMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const clientType = req.get('x-client-type');
    if (clientType === 'mobile') {
      req.isMobile = true;
      return next();
    }
    
    // Default to false (Web)
    req.isMobile = false; 
    
    next();
  }
}

