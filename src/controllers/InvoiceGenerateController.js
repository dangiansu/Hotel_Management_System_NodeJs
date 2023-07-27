const RoomBook = require("../models/roomBook.model");
const pdf = require("html-pdf");
const ejs = require("ejs");
const nodemailer = require("nodemailer");
const { handleBadRequest } = require("../middleware/handle_error");

exports.pdfGenerate = async (req, res, next) => {
  try {
    const uid = req.user._id;
    const { email } = req.body;
    const bookingDetails = await RoomBook.find({
      userId: uid,
      email,
      isBooked: true,
      paymentStatus: "Paid",
    })
      .populate({
        path: "roomId",
        select: "-_id room_type room_image room_amount",
      })
      .select({
        firstname: 1,
        lastname: 1,
        email: 1,
        phone_no: 1,
        start_date: 1,
        end_date: 1,
        tot_amt: 1,
        paymentId: 1,
      });
    if (bookingDetails.length === 0) {
      return handleBadRequest(res, "No Room Booking Data Found.");
    }

    // Generate the HTML content with invoice details in a table format
    const htmlContent = generateInvoiceHTML(bookingDetails);

    // Options for PDF generation
    const pdfOptions = {
      format: "Letter",
    };

    // Generate the PDF from HTML content
    pdf.create(htmlContent, pdfOptions).toStream((err, stream) => {
      if (err) {
        return res.status(500).send("Error generating PDF");
      }

      // Set the content disposition for the downloadable attachment
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="invoice.pdf"'
      );
      res.setHeader("Content-Type", "application/pdf");

      // Pipe the PDF content directly to the response stream
      stream.pipe(res);
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error." });
  }
};

exports.sendInvoiceByEmail = async (req, res, next) => {
  try {
    const uid = req.user._id;
    const { email } = req.body;
    const bookingDetails = await RoomBook.find({
      userId: uid,
      email,
      isBooked: true,
      paymentStatus: "Paid",
    })
      .populate({
        path: "roomId",
        select: "-_id room_type room_image room_amount",
      })
      .select({
        firstname: 1,
        lastname: 1,
        email: 1,
        phone_no: 1,
        start_date: 1,
        end_date: 1,
        tot_amt: 1,
      });
    if (bookingDetails.length === 0) {
      return handleBadRequest(res, "No Room Booking Data Found.");
    }

    // Generate the HTML content with invoice details in a table format
    const htmlContent = generateInvoiceHTML(bookingDetails);

    // Options for PDF generation
    const pdfOptions = {
      format: "Letter",
    };

    // Generate the PDF from HTML content
    pdf.create(htmlContent, pdfOptions).toStream(async (err, stream) => {
      if (err) {
        return res.status(500).send("Error generating PDF");
      }

      // Create a Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
      });

      // Set the content disposition for the downloadable attachment
      const attachment = {
        filename: "invoice.pdf",
        content: stream,
      };

      // Compose the email message
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Invoice for your Room Booking",
        html: "<p>Dear customer, Your Room is Booked. please find your invoice attached.</p>",
        attachments: [attachment],
      };

      // Send the email with the attachment
      try {
        await transporter.sendMail(mailOptions);
        res.status(200).send({ message: "Invoice sent successfully!" });
      } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Error sending the email" });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Internal Server Error." });
  }
};

function generateInvoiceHTML(bookingDetails) {
  return ejs.render(
    `<html>
      <head>
        <style>
          table {
            font - family: Arial, sans-serif;
          border-collapse: collapse;
          width: 100%;
        }

          td,
          th {
            border: 1px solid #dddddd;
          text-align: left;
          padding: 8px;
        }
        </style>
      </head>
      <body>
        <h3 style="text-align: center;">Unwind Hotel</h3>
        <% bookings.forEach((booking, index) => { %>
            <hr>
              <hr>
                <h3>User Details:</h3>
                <table>
                  <tr>
                    <th>Name:<%= booking.firstname %>
                    </th>
                    <th>Email: <%=booking.email %>
                    </th>
                  </tr>
                  <tr>
                    <th>Contact Number: <%= booking.phone_no %>
                    </th>
                    <th>Payment ID:<%= booking.paymentId %>
                    </th>
                  </tr>
                </table>
                <h3>Booking Details:</h3>
                <table>
                  <tr>
                    <th>No</th>
                    <th>Room Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Price</th>
                  </tr>

                  <tr>
                    <td><%= index + 1 %></td>


                    <td><%= booking.roomId.room_type %></td>
                    <td><%= new Date(booking.start_date).toLocaleDateString() %></td>
                    <td><%= new Date(booking.end_date).toLocaleDateString() %></td>
                    <td>$<%= booking.tot_amt.toFixed(2) %></td>
                  </tr>

                </table>
                <% }) %>
                <td><h3>Total Amount: $<%= bookings.reduce((total, booking) => total + booking.tot_amt, 0).toFixed(2) %></td></h3>
              <h3>Thank you for visiting. Please Visit again!</h3>
            </body>
          </html>`,
    { bookings: bookingDetails }
  );
}
