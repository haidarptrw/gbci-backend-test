import { Console, Context, Effect } from "effect";
import { MailError } from "../errors";
import * as nodemailer from "nodemailer";

export class MailClient extends Context.Tag("MailClient")<
    MailClient,
    {
        readonly sendMail: (to: string, subject: string, html: string) => Effect.Effect<void, MailError>;
    }
>() {}

export const makeNodemailerClient = (config: { host: string; user: string; pass: string }) => {
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: 587,
        secure: false,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });

    return MailClient.of({
        sendMail: (to, subject, html) => Effect.tryPromise({
            try: async () => {
                await transporter.sendMail({
                    from: `"No Reply" <${config.user}>`,
                    to,
                    subject,
                    html,
                });
            },
            catch: (e) => new MailError({ message: "Failed to send email", originalError: e })
        })
    });
};

export const makeConsoleMailClient = () => {
    return MailClient.of({
        sendMail: (to, subject, html) => Effect.sync(() => {
            console.log("================ [MOCK MAIL] ================");
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${html}`);
            console.log("=============================================");
        })
    });
};