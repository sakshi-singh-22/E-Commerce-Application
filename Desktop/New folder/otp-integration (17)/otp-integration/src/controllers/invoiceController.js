const Invoice = require("../model/invoiceModel");
const PDFDocument = require("pdfkit");
const Admin = require("../model/adminModel");
const Vendor = require("../model/vendorModel");
const User = require("../model/authmodel");
const generateInvoicePDF = async (req, res) => {
  const { orderId } = req.params;
  const { userId } = req.body;
  try {
    if (!userId) {
      return res
        .status(403)
        .json({ message: "Access denied. User ID is required." });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(403)
        .json({ message: "Invalid user ID. Access denied." });
    }
    // Fetch the invoice using the provided orderId
    const invoice = await Invoice.findOne({ orderId: orderId });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Generate PDF for Invoice
    const doc = new PDFDocument({ margin: 50 });
    let filename = `Invoice-${invoice._id}.pdf`;
    filename = encodeURIComponent(filename);

    // Set response headers for PDF download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add Company Header
    doc
      .fontSize(25)
      .text("DO DASH", { align: "center" })
      .fontSize(10)
      .text("Company Address Line 1", { align: "center" })
      .text("Company Address Line 2", { align: "center" })
      .text("Contact Info", { align: "center" })
      .moveDown(2);

    // Add a horizontal line below the header
    doc.moveTo(50, 150).lineTo(550, 150).stroke();

    // Invoice Title and Number
    doc
      .fontSize(20)
      .text("Invoice", 50, 170)
      .fontSize(10)
      .text(`Invoice Number: ${invoice._id}`, 50, 200)
      .text(`Order Number: ${invoice.orderId}`, 50, 215)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 230)
      .moveDown();

    // Customer Details
    doc
      .fontSize(12)
      .text(`Customer Name: ${invoice.customerName}`, 50, 250)
      .text(`Delivery Address: ${invoice.deliveryAddress}`, 50, 280)
      .text(
        `Contact Info: ${invoice.contactInfo.phone}, ${invoice.contactInfo.email}`,
        50,
        295
      )
      .moveDown();

    // Add payment method
    doc
      .fontSize(12)
      .text(`Payment Method: ${invoice.paymentMethod}`, 50, 320)
      .moveDown();

    // Add a horizontal line before the product details
    doc.moveTo(50, 340).lineTo(550, 340).stroke();

    // Product Details Header
    doc.fontSize(14).text("Products", 50, 350).moveDown(0.5);

    // Product Table Headers
    doc
      .fontSize(10)
      .text("Description", 50, 370)
      .text("Quantity", 250, 370)
      .text("Unit Price", 350, 370)
      .text("Total", 450, 370)
      .moveDown();

    // Product Details
    let yPosition = 390;
    invoice.products.forEach((product, index) => {
      doc
        .fontSize(10)
        .text(product.productDescription, 50, yPosition)
        .text(product.quantity, 250, yPosition)
        .text(product.unitPrice.toFixed(2), 350, yPosition)
        .text(product.productTotal.toFixed(2), 450, yPosition);
      yPosition += 20; // Move to the next line for the next product
    });

    // Add a horizontal line before the totals
    doc
      .moveTo(50, yPosition + 10)
      .lineTo(550, yPosition + 10)
      .stroke();

    // Amount Details
    doc
      .fontSize(10)
      .text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, 400, yPosition + 25)
      .text(`Tax: ${invoice.taxDetails.toFixed(2)}`, 400, yPosition + 40)
      .text(
        `Delivery Charges: ${invoice.deliveryCharges.toFixed(2)}`,
        400,
        yPosition + 55
      )
      .text(
        `Total Amount: ${invoice.totalAmount.toFixed(2)}`,
        400,
        yPosition + 70
      )
      .moveDown();

    // Footer
    doc
      .fontSize(10)
      .text("Thank you for your business!", 50, doc.page.height - 100, {
        align: "center",
        width: 500,
      });

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({
      message: "Failed to generate invoice PDF",
      error: error.message,
    });
  }
};

const generateInvoicePDFForAdmin = async (req, res) => {
  const { orderId } = req.params;
  const { adminId } = req.body;
  try {
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }
    // Fetch the invoice using the provided orderId
    const invoice = await Invoice.findOne({ orderId: orderId });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Generate PDF for Invoice with Admin details
    const doc = new PDFDocument({ margin: 50 });
    let filename = `Invoice-Admin-${invoice._id}.pdf`;
    filename = encodeURIComponent(filename);

    // Set response headers for PDF download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add Company Header
    doc
      .fontSize(25)
      .text("DO DASH", { align: "center" })
      .fontSize(10)
      .text("Company Address Line 1", { align: "center" })
      .text("Company Address Line 2", { align: "center" })
      .text("Contact Info", { align: "center" })
      .moveDown(2);

    // Add a horizontal line below the header
    doc.moveTo(50, 150).lineTo(550, 150).stroke();

    // Invoice Title and Number
    doc
      .fontSize(20)
      .text("Invoice", 50, 170)
      .fontSize(10)
      .text(`Invoice Number: ${invoice._id}`, 50, 200)
      .text(`Order Number: ${invoice.orderId}`, 50, 215)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 230)
      .moveDown();

    // Customer Details
    doc
      .fontSize(12)
      .text(`Customer Name: ${invoice.customerName}`, 50, 250)
      .text(`Delivery Address: ${invoice.deliveryAddress}`, 50, 280)
      .text(`Contact Phone: ${invoice.contactInfo.phone}`, 50, 295)
      .text(`Contact Email: ${invoice.contactInfo.email}`, 50, 310)
      .moveDown();

    // Add payment method
    doc
      .fontSize(12)
      .text(`Payment Method: ${invoice.paymentMethod}`, 50, 325)
      .moveDown();

    // Add a horizontal line before the product details
    doc.moveTo(50, 340).lineTo(550, 340).stroke();

    // Product Details Header
    doc.fontSize(14).text("Products", 50, 350).moveDown(0.5);

    // Product Table Headers
    doc
      .fontSize(10)
      .text("Description", 50, 370)
      .text("Quantity", 150, 370)
      .text("Unit Price", 250, 370)
      .text("Total", 350, 370)
      .text("Vendor", 450, 370)
      .moveDown();

    // Product Details with Vendor Information
    let yPosition = 390;
    invoice.products.forEach((product) => {
      doc
        .fontSize(10)
        .text(product.productDescription, 50, yPosition, { width: 100 })
        .text(product.quantity, 160, yPosition)
        .text(product.unitPrice.toFixed(2), 250, yPosition)
        .text(product.productTotal.toFixed(2), 350, yPosition)
        .text(product.vendorName, 430, yPosition);

      // Add Vendor Contact and Location
      const vendorContactText = product.vendorContact.phone;
      const vendorEmailText = product.vendorContact.email;
      const vendorLocationText = product.vendorLocation;

      doc
        .fontSize(7)
        .text(vendorContactText, 430, yPosition + 15, {
          width: 100,
          align: "left",
        })
        .text(vendorEmailText, 430, yPosition + 26, {
          width: 100,
          align: "left",
        })
        .text(vendorLocationText, 430, yPosition + 40, {
          width: 100,
          align: "left",
        });

      // Update yPosition for the next product
      yPosition += 70; // Adjust based on the space needed
    });

    // Add a horizontal line before the totals
    doc
      .moveTo(50, yPosition + 10)
      .lineTo(550, yPosition + 10)
      .stroke();

    // Amount Details
    doc
      .fontSize(10)
      .text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, 400, yPosition + 25)
      .text(`Tax: ${invoice.taxDetails.toFixed(2)}`, 400, yPosition + 40)
      .text(
        `Delivery Charges: ${invoice.deliveryCharges.toFixed(2)}`,
        400,
        yPosition + 55
      )
      .text(
        `Total Amount: ${invoice.totalAmount.toFixed(2)}`,
        400,
        yPosition + 70
      )
      .moveDown();

    // Footer
    doc
      .fontSize(10)
      .text("Thank you for your business!", 50, doc.page.height - 100, {
        align: "center",
        width: 500,
      });

    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF for admin:", error);
    res.status(500).json({
      message: "Failed to generate invoice PDF for admin",
      error: error.message,
    });
  }
};

// Function to generate vendor-specific invoice PDF
const generateVendorInvoicePDF = async (req, res) => {
  const { orderId } = req.params;
  const { vendorId } = req.body;
  try {
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    const invoice = await Invoice.findOne({ orderId: orderId });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const vendorProducts = invoice.products.filter(
      (product) => product.vendorId.toString() === vendorId.toString()
    );

    if (vendorProducts.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this vendor in the order" });
    }

    const doc = new PDFDocument({ margin: 50 });
    let filename = `Invoice-Vendor-${invoice._id}.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc
      .fontSize(25)
      .text("DO DASH", { align: "center" })
      .fontSize(10)
      .text("Company Address Line 1", { align: "center" })
      .text("Company Address Line 2", { align: "center" })
      .text("Contact Info", { align: "center" })
      .moveDown(2);

    doc.moveTo(50, 150).lineTo(550, 150).stroke();

    doc
      .fontSize(20)
      .text("Invoice", 50, 170)
      .fontSize(10)
      .text(`Invoice Number: ${invoice._id}`, 50, 200)
      .text(`Order Number: ${invoice.orderId}`, 50, 215)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 230)
      .moveDown();

    doc.moveTo(50, 340).lineTo(550, 340).stroke();

    doc.fontSize(14).text("Products", 50, 350).moveDown(0.5);

    doc
      .fontSize(10)
      .text("Description", 50, 370)
      .text("Quantity", 160, 370)
      .text("Unit Price", 250, 370)
      .text("Total", 350, 370)
      .text("Product Id", 450, 370)
      .moveDown();

    let yPosition = 390;
    vendorProducts.forEach((product) => {
      const descriptionWidth = 100;

      const descriptionHeight = doc
        .fontSize(10)
        .heightOfString(product.productDescription, {
          width: descriptionWidth,
        });

      doc.fontSize(10).text(product.productDescription, 50, yPosition, {
        width: descriptionWidth,
        align: "left",
      });

      doc
        .fontSize(10)
        .text(product.quantity, 170, yPosition)
        .text(product.unitPrice.toFixed(2), 250, yPosition)
        .text(product.productTotal.toFixed(2), 350, yPosition)
        .text(product.productId, 460, yPosition);

      yPosition += descriptionHeight + 10;
    });

    doc
      .moveTo(50, yPosition + 10)
      .lineTo(550, yPosition + 10)
      .stroke();

    // Footer
    doc
      .fontSize(10)
      .text("Thank you for your business!", 50, doc.page.height - 100, {
        align: "center",
        width: 500,
      });

    doc.end();
  } catch (error) {
    console.error("Error generating vendor-specific invoice PDF:", error);
    res.status(500).json({
      message: "Failed to generate vendor-specific invoice PDF",
      error: error.message,
    });
  }
};

module.exports = {
  generateInvoicePDF,
  generateInvoicePDFForAdmin,
  generateVendorInvoicePDF,
};