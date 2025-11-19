const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    members: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length === 2;
        },
        message: 'Conversation must have exactly two members',
      },
    },
    lastMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
