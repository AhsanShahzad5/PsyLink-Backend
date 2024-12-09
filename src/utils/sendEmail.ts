const nodeMailer = require("nodemailer");


const sendEmail = async (options:any) => {        
    

        const transporter = nodeMailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMPT_MAIL,
                pass: process.env.SMPT_PASSWORD,
            },
        });

    const mailOptions = {
        from : process.env.SMPT_MAIL, 
        to : options.email,    
        subject : options.subject,
        text : options.message,
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
    } catch (error) {
        if (error instanceof Error) {
            console.error("Failed to send email:", error.message);
        } else {
            console.error("An unknown error occurred while sending email:", error);
        }
        throw new Error("Email sending failed");
    }
}

module.exports = sendEmail;

