const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  productId: { type: String, required: true },
  comments: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      comment: { type: String, required: true },
      images: [{ type: String }],
      upvote: { type: Number, default: 0 },
      downvote: { type: Number, default: 0 },
      replies: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          reply: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;