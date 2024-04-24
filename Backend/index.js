const { Sequelize, DataTypes } = require('sequelize');
const express = require("express");
const app = express();
app.use(express.json());
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv')

dotenv.config(); ////  dotenv function permission  ...

// Create a Sequelize instance to connect to the database
const sequelize = new Sequelize(
    'tasksequelize',   ///database name 
    'root',
    '', {
    host: 'localhost',
    dialect: 'mysql'
});

// Define the model for the 'emp' table
const Emp = sequelize.define("emp", {
    empid: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    empname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mobile_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    DOB: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
});


/////////////////////////////////

sequelize.authenticate()
    .then(() => {
        console.log("Database connected");
    })
    .catch((err) => {
        console.log("Not Connected", err);
    });

// Synchronize the model with the database to create the table
sequelize.sync()
    .then(() => {
        console.log("Table is created");
    })
    .catch((err) => {
        console.log("Table not created", err);
    });

// Function to send birthday wishes email  nodemailer code 
function sendBirthdayWishes(empName, email) {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.USER_EMAIL, // Update with your Gmail email
                pass: process.env.USER_PASS // Update with your Gmail password
            }
        });

        const mailOptions = {
            from: process.env.USER_EMAIL, // Update with your Gmail email
            to: email,
            subject: "Happy Birthday",
            text: `Dear ${empName},\n\nWishing you a fantastic birthday filled with joy and happiness!\n\nBest regards,\nYour Company`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    });
}

// Scheduled task to send birthday wishes every minute
cron.schedule('* * * * *', async () => {
    const today = new Date().toISOString().slice(5, 10);
    try {
        const employees = await Emp.findAll({
            where: sequelize.where(sequelize.fn('DATE_FORMAT', sequelize.col('DOB'), '%m-%d'), today)
        });
        await Promise.all(employees.map(async (employee) => {
            await sendBirthdayWishes(employee.empname, employee.email);
            console.log(`Birthday wishes sent to ${employee.empname} at ${employee.email}`);
            await sendSMS(employee.empname, employee.mobile_no);
        }));
    } catch (error) {
        console.error('Failed to retrieve employees: ', error);
    }
});
////////////////////////  twilio   ////////////////////////////////////

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Function to send SMS 
const sendSMS = async (name, mobile_no) => {
    let msgOption = {
      from: process.env.TWILIO_PHONE,
      to: mobile_no,
      body: `Happy Birthday, ${name}!`,
    };
    try {
      const message = await client.messages.create(msgOption);
      console.log(message);
    } catch (err) {
      console.error(err);
    }
  };
    

/////////////////// post  data in database  /////////////////////////

app.post("/savedata", (req, res) => {
    let { empid, empname, city, email, mobile_no, DOB } = req.body;   ///  body se ye data send karge .
    Emp.create({ empid, empname, city, email, mobile_no, DOB })  /// this is query  
        .then((result) => res.json(result))
        .catch((err) => res.send(err))
    // console.log(req.body)
})


// Start the server
app.listen(4000, () => {
    console.log("Server is running on port 4000");
});