import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || "SUPER_SECRET_NEXUS_KEY_1952";

export function generateAccessToken(subscriber: string, agentAddress: string, invoiceId: string): string {
    return jwt.sign(
        { subscriber, agentAddress, invoiceId },
        SECRET_KEY,
        { expiresIn: '1h' }
    );
}

export function x402Middleware(agentLeaderboardContract: string, agentAddress: string, subscriptionFee: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Require payment
            res.status(402).json({
                error: "Payment Required by Risk Guardian",
                invoice: {
                    payToContract: agentLeaderboardContract,
                    routeFunction: "routeSubscriptionFee(address,address,uint256)",
                    agentAddress: agentAddress,
                    amountRequiredUSDC: subscriptionFee,
                    networkUrl: "https://testrpc.xlayer.tech",
                    chainId: 1952
                }
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, SECRET_KEY) as any;
            if (decoded.agentAddress.toLowerCase() !== agentAddress.toLowerCase()) {
                res.status(403).json({ error: "Token valid but for another agent" });
                return;
            }

            // Allow access to the target endpoint
            (req as any).user = decoded;
            next();
        } catch (err) {
            res.status(403).json({ error: "Invalid or expired payment token" });
        }
    };
}
