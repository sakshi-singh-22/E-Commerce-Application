const express = require("express");
const router = express.Router();
const taxiReviewController = require("../../controllers/Taxi/TaxiReviewController");
const RouteOrderReviewCOntroller = require("../../controllers/Taxi/RouteOrderReviewController");
// taxi review
router.post("/reviews", taxiReviewController.postTaxiReview);
router.get("/reviews/user/:userId", taxiReviewController.getReviewsByUser);
router.get("/reviews/trip/:tripId", taxiReviewController.getReviewsForRide);
router.get(
  "/reviews/driver/:driverId",
  taxiReviewController.getReviewsForDriver
);
router.get("/reviews", taxiReviewController.getAllReviews);
router.delete("/reviews/:reviewId", taxiReviewController.deleteReview);

// route order review
router.post("/order/reviews", RouteOrderReviewCOntroller.postReview);
router.get(
  "/order/userReviews/:userId",
  RouteOrderReviewCOntroller.getReviewUser
);
router.get("/order/reviews/all", RouteOrderReviewCOntroller.getAllReviews);
router.put("/order/reviews/update", RouteOrderReviewCOntroller.updateReview);
router.delete("/order/reviews/delete", RouteOrderReviewCOntroller.deleteReview);
module.exports = router;