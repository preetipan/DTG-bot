const { Client } = require("@line/bot-sdk");
const { channelAccessToken } = require("../../../config");
const {
  getSortedUserDetails,
  AddMember,
  checkIfUserExists,
  getUserMoney,
  updateAdminData,
} = require("../BotFunc/userController");
const {
  getBankAccountDetails,
  depositMoneyCredit,
  depositMoneyCash,
  withdrawMoney,
} = require("../BotFunc/bankAccountController");
const {
  setGroup,
  setSubGroup,
  setHilo,
  setCock,
  getGroupMembers,
} = require("../BotFunc/groupController");
const {
  setPlayInday,
  setMainPlay,
  updateMainPlay,
  checkOpenPlayInday,
  resetMainRound,
  setNumberMainRound,
  checkPreviousRoundStatus,
  setOpenOdds,
  checkPreviousSubRoundStatus,
  setCloseOdds,
} = require("../BotFunc/playController");
const { checkUserRole } = require("../BotFunc/usePermission");

const client = new Client({ channelAccessToken });

// Handle setGroup# command
async function handleSetGroupCommand(event, userMessage) {
  // ตรวจสอบสิทธิ์ของผู้ใช้ก่อน
  const permissionResult = await checkUserRole(event, ["Superadmin"]);
  if (!permissionResult.success) {
    return null;
  }

  const groupName = userMessage.substring(9).trim();
  if (groupName) {
    try {
      const user_id = event.source.userId;
      const confirmationMessage = await setGroup(event, groupName, user_id);

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: confirmationMessage,
      });
      // return { type: "text", text: confirmationMessage };
    } catch (error) {
      console.error("Error setting group:", error);
      return sendErrorMessage(
        event,
        "เกิดข้อผิดพลาดในการตั้งค่ากลุ่ม กรุณาลองใหม่"
      );
    }
  } else {
    return sendErrorMessage(event, "กรุณาระบุชื่อกลุ่มหลังคำสั่ง setgroup#");
  }
}

// Handle setSubGroup# command
async function handleSetSubGroupCommand(event, userMessage) {
  // ตรวจสอบสิทธิ์ของผู้ใช้ก่อน
  const permissionResult = await checkUserRole(event, ["Superadmin"]);
  if (!permissionResult.success) {
    return null;
  }

  const messageContent = userMessage.substring(12).trim();
  const groupNames = messageContent.split("#");

  if (groupNames.length === 2) {
    const mainGroupName = groupNames[0]?.trim();
    const subGroupName = groupNames[1]?.trim();

    console.log("mainGroupName : " + mainGroupName);
    console.log("subGroupName : " + subGroupName);

    // ถ้าทั้งสองชื่อไม่เป็นค่าว่าง
    if (mainGroupName && subGroupName) {
      const confirmationMessage = await setSubGroup(
        event,
        mainGroupName,
        subGroupName
      );

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: confirmationMessage,
      });
      // return { type: "text", text: confirmationMessage };
    } else {
      return null;
    }
  } else {
    return null;
  }
}

// Handle "เพิ่มทั้งหมด" command
async function handleAddAllMembers(event) {
  // ตรวจสอบสิทธิ์
  const permissionResult = await checkUserRole(event, ["Superadmin"]);
  if (!permissionResult.success) {
    return null;
  }

  const groupId = event.source.groupId || event.source.roomId;
  if (!groupId) {
    return sendErrorMessage(event, "ไม่สามารถระบุ groupId หรือ roomId ได้");
  }

  try {
    const confirmationMessage = await getGroupMembers(groupId);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: confirmationMessage,
    });
    // return {
    //   type: "text",
    //   text: result.message || "เพิ่มสมาชิกทั้งหมดในกลุ่มเรียบร้อยแล้ว!",
    // };
  } catch (error) {
    console.error("Error adding members:", error);
    return sendErrorMessage(
      event,
      `เกิดข้อผิดพลาดในการเพิ่มสมาชิก: ${error.message}`
    );
  }
}

// Handle เพิ่มสิทธิ์ แอดมิน
async function handleUpdateAdminRole(event, userMessage, admin) {
  try {
    // ตรวจสอบสิทธิ์ของผู้ใช้ (Superadmin หรือ Admin)
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    // ใช้ regex เพื่อจับคู่ข้อความในรูปแบบ @username +admin หรือ @username -admin
    const userIdMatch = userMessage.match(/^@([^\s]+)\s*(\+admin|-admin)$/i);

    console.log("userIdMatch:", userIdMatch); // ตรวจสอบผลลัพธ์จาก match

    if (!userIdMatch) {
      return sendErrorMessage(
        event,
        "คำสั่งไม่ถูกต้อง. ตัวอย่าง: @username +admin หรือ @username -admin"
      );
    }

    // ดึง userId และ คำสั่ง (+admin หรือ -admin) ออกจากข้อความ
    const userId = userIdMatch[1]; // ชื่อผู้ใช้ที่ได้รับจากข้อความ
    const action = userIdMatch[2]; // +admin หรือ -admin

    let profileName = "ไม่รู้จักชื่อ";
    try {
      // ใช้ userId ที่ถูกต้องจากข้อความที่จับได้
      const profile = await client.getProfile(userId);
      console.log("profile : " + profile);
      if (profile && profile.displayName) {
        profileName = profile.displayName;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      profileName = "ไม่พบโปรไฟล์";
    }

    let newRole;
    let roleName;

    if (action === "+admin") {
      newRole = 2; // แอดมิน
      roleName = "แอดมิน";
    } else if (action === "-admin") {
      newRole = 3; // สมาชิกทั่วไป
      roleName = "สมาชิกทั่วไป";
    } else {
      return sendErrorMessage(event, "ไม่พบคำสั่งที่ถูกต้อง");
    }

    const updateResult = await updateAdminData(userId, event.source.groupId, {
      role: newRole,
    });

    if (updateResult && updateResult.success) {
      const replyMessage = {
        type: "text",
        text: `${profileName} ได้รับการอัปเดตเป็น ${roleName} เรียบร้อยแล้ว!`,
      };

      return client.replyMessage(event.replyToken, replyMessage);
    } else {
      return sendErrorMessage(event, `ไม่สามารถอัปเดตสิทธิ์ ${roleName} ได้`);
    }
  } catch (error) {
    console.error("Error updating admin role:", error);
    return sendErrorMessage(event, "เกิดข้อผิดพลาดในการอัปเดตสิทธิ์");
  }
}

// Handle ฝากเงินเครดิต command
async function handleTopUpCredit(event, userMessage) {
  try {
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    // ตรวจสอบและดึงข้อมูลจากข้อความ
    const match = userMessage.match(/\+\+(\d+)=([\d]+)/);
    if (!match) {
      return sendErrorMessage(
        event,
        "รูปแบบคำสั่งไม่ถูกต้อง\nตัวอย่าง: ++รหัสผู้ใช้=1000=200"
      );
    }

    const userCode = match[1]; // รหัสผู้ใช้
    const amount = parseInt(match[2], 10); // จำนวนเงิน

    // ตรวจสอบว่าจำนวนเงินต้องเป็นค่าบวก
    if (amount <= 0) {
      return sendErrorMessage(event, "จำนวนเงินต้องมากกว่า 0 บาท");
    }

    // ดำเนินการเติมเงิน
    const response = await depositMoneyCredit(userCode, amount);
    if (response && response.type === "text") {
      return client.replyMessage(event.replyToken, response); // ส่งข้อความที่ได้จาก depositMoneyCredit
    } else {
      throw new Error(response.message || "ไม่สามารถเติมเงินได้");
    }
  } catch (error) {
    console.error("Error in handleTopUpCredit:", error.message);
    return sendErrorMessage(
      event,
      `เกิดข้อผิดพลาด: ${error.message || "กรุณาลองใหม่"}`
    );
  }
}

// Handle ฝากเงินสด command
async function handleCashCustomer(event, userMessage) {
  try {
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    // ตรวจสอบและดึงข้อมูลจากข้อความ
    const match = userMessage.match(/\+(\d+)=([\d]+)/);
    if (!match) {
      return sendErrorMessage(
        event,
        "รูปแบบคำสั่งไม่ถูกต้อง\nตัวอย่าง: +รหัสผู้ใช้=1000=200"
      );
    }

    const userCode = match[1]; // รหัสผู้ใช้
    const amount = parseInt(match[2], 10); // จำนวนเงิน

    // ตรวจสอบว่าจำนวนเงินต้องเป็นค่าบวก
    if (amount <= 0) {
      return sendErrorMessage(event, "จำนวนเงินต้องมากกว่า 0 บาท");
    }

    // ดำเนินการบันทึกข้อมูลลูกค้าเงินสด
    const response = await depositMoneyCash(userCode, amount); // ฟังก์ชันฝากเงินสด
    if (response && response.type === "text") {
      return client.replyMessage(event.replyToken, response); // ส่งข้อความที่ได้จาก depositMoneyCredit
    } else {
      throw new Error(response.message || "ไม่สามารถเติมเงินได้");
    }
  } catch (error) {
    console.error("Error in handleCashCustomer:", error.message);
    return sendErrorMessage(
      event,
      `เกิดข้อผิดพลาด: ${error.message || "กรุณาลองใหม่"}`
    );
  }
}

// Handle ถอนเงิน command
async function handleWithdrawMoney(event, userMessage) {
  try {
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    // ตรวจสอบและดึงข้อมูลจากข้อความ
    const match = userMessage.match(/\-(\d+)=([\d]+)/); // รูปแบบคำสั่ง: -รหัสผู้ใช้=1000=200
    if (!match) {
      return sendErrorMessage(
        event,
        "รูปแบบคำสั่งไม่ถูกต้อง\nตัวอย่าง: -รหัสผู้ใช้=1000=200"
      );
    }

    const userCode = match[1]; // รหัสผู้ใช้
    const amount = parseInt(match[2], 10); // จำนวนเงิน

    // ตรวจสอบว่าจำนวนเงินต้องเป็นค่าบวก
    if (amount <= 0) {
      return sendErrorMessage(event, "จำนวนเงินต้องมากกว่า 0 บาท");
    }

    // ดำเนินการถอนเงิน
    const response = await withdrawMoney(userCode, amount); // ฟังก์ชันถอนเงิน
    if (response && response.type === "text") {
      return client.replyMessage(event.replyToken, response); // ส่งข้อความที่ได้จาก depositMoneyCredit
    } else {
      throw new Error(response.message || "ไม่สามารถถอนเงินได้");
    }
  } catch (error) {
    console.error("Error in handleWithdrawMoney:", error.message);
    return sendErrorMessage(
      event,
      `เกิดข้อผิดพลาด: ${error.message || "กรุณาลองใหม่"}`
    );
  }
}

// Handle เปิดปิดไฮโล command (เปิด/ปิด)
async function handleSetHiloCommand(event, status) {
  try {
    const permissionResult = await checkUserRole(event, ["Superadmin"]);
    if (!permissionResult.success) {
      return null;
    }

    const confirmationMessage = await setHilo(event, status);
    // return { type: "text", text: confirmationMessage };
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: confirmationMessage,
    });
  } catch (error) {
    console.error("Error setting Hilo:", error);
    return sendErrorMessage(
      event,
      `เกิดข้อผิดพลาดในการ${status}ไฮโล กรุณาลองใหม่`
    );
  }
}

// Handle เปิดขปิดไก่ชน command (เปิด/ปิด)
async function handleSetCockCommand(event, status) {
  try {
    const permissionResult = await checkUserRole(event, ["Superadmin"]);
    if (!permissionResult.success) {
      return null;
    }

    const confirmationMessage = await setCock(event, status);
    // return { type: "text", text: confirmationMessage };
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: confirmationMessage,
    });
  } catch (error) {
    console.error("Error setting Cock:", error);
    return sendErrorMessage(
      event,
      `เกิดข้อผิดพลาดในการ${status}ไก่ชน กรุณาลองใหม่`
    );
  }
}

// Handle แจ้งเลขธนาคาร details
async function handleBankAccountDetails(event) {
  try {
    const groupId = event.source.groupId;
    const userId = event.source.userId;
    const member = await client.getGroupMemberProfile(groupId, userId);
    const bankAccountMessage = getBankAccountDetails(member);

    return client.replyMessage(event.replyToken, [bankAccountMessage]);
  } catch (error) {
    console.error("Error fetching bank account details:", error);
    return sendErrorMessage(
      event,
      "เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี กรุณาลองใหม่"
    );
  }
}

// Handle เทส
async function handleTestDetails(event) {
  try {
    // ดึงข้อมูลสมาชิกจาก LINE API
    const groupId = event.source.groupId; // ใช้ groupId จาก event
    const userId = event.source.userId; // ใช้ userId จาก event
    const member = await client.getGroupMemberProfile(groupId, userId);

    const replyMessage = {
      type: "flex",
      altText: `ยินดีต้อนรับกลับคุณ ${member.displayName} ข้อมูลบัญชีของคุณถูกแสดงแล้ว`,
      contents: {
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "9922120029",
              weight: "bold",
              size: "xl",
              align: "center",
              color: "#FFFFFF",
            },
            {
              type: "text",
              text: "ไทยพาณิชย์\nปรีติพันธ์ สุทธิพันธ์",
              align: "center",
              color: "#FFFFFF",
              margin: "md",
              wrap: true,
            },
            {
              type: "button",
              style: "primary",
              color: "#AAAAAA",
              action: {
                type: "uri",
                label: "คัดลอกเลขบัญชี",
                uri: "line://app/clipboard?text=9922120029",
              },
              margin: "lg",
            },
            {
              type: "button",
              style: "primary",
              color: "#00C851",
              action: {
                type: "uri",
                label: "กรุณาส่งสลิป",
                uri: "line://ti/p/@892xtjpl",
              },
              margin: "sm",
            },
          ],
          backgroundColor: "#5A2D82",
        },
      },
    };

    // ส่ง Flex Message กลับไปยังผู้ใช้
    return client.replyMessage(event.replyToken, replyMessage);
  } catch (error) {
    console.error("Error fetching member profile:", error);
    return sendErrorMessage(
      event,
      "เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก กรุณาลองใหม่"
    );
  }
}

// Handle user details
async function handleUserDetails(event) {
  try {
    const userDetailsMessage = await getSortedUserDetails();
    return client.replyMessage(event.replyToken, userDetailsMessage);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return sendErrorMessage(
      event,
      "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ กรุณาลองใหม่"
    );
  }
}

// Handle เช็คยอดเงินคงเหลือ
async function handleUserCheckMoney(event) {
  const userId = event.source.userId;
  const groupId = event.source.groupId;
  try {
    const member = await client.getGroupMemberProfile(groupId, userId);
    if (!member) {
      return sendErrorMessage(event, "ไม่สามารถดึงข้อมูลสมาชิกได้");
    }

    // ตรวจสอบว่า userId นี้มีอยู่ในฐานข้อมูลหรือไม่
    const isUserExist = await checkIfUserExists(userId);
    if (!isUserExist) {
      console.log(`User ${userId} does not exist, adding user to database...`);
      await AddMember(member, userId, groupId);
    }

    // ดึงข้อมูลยอดเงินของผู้ใช้
    const userDetailsMessage = await getUserMoney(userId, member);
    return client.replyMessage(event.replyToken, [userDetailsMessage]);
  } catch (error) {
    console.error("Error in handleUserCheckMoney:", error);
    return sendErrorMessage(event, "กรุณากด c ใหม่อีกครั้ง");
  }
}

// Handle เปิดรอบเล่นประจำวัน
async function handleOpenIndayCommand(event) {
  try {
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    const playInday = await checkOpenPlayInday(event);
    if (!permissionResult.success) {
      console.log("ไม่มีสิทธิ์ใช้คำสั่งนี้");
      return null;
    }

    let openIndayMessage;

    if (!playInday) {
      // ถ้าเปิดบ้านไก่ชนไม่อยู่ จะเปิดบ้าน
      openIndayMessage = await setPlayInday(event, true);
    } else {
      // ถ้าบ้านไก่ชนเปิดอยู่แล้ว
      openIndayMessage = "เปิดบ้านไก่ชนอยู่แล้ว!!!";
    }

    // ส่งข้อความยืนยันการเปิดบ้าน
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: openIndayMessage,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);

    // ส่งข้อความแสดงข้อผิดพลาดที่เกิดขึ้น
    return sendErrorMessage(
      event,
      "เกิดข้อผิดพลาดในการเปิดบ้านไก่ชน กรุณาลองใหม่"
    );
  }
}

// Handle ปิดรอบเล่นประจำวัน
async function handleCloseIndayCommand(event) {
  try {
    const playInday = await checkOpenPlayInday(event);
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    let closeIndayMessage;

    if (!playInday) {
      closeIndayMessage = "ปิดบ้านไก่ชนอยู่แล้ว!!!";
    } else {
      closeIndayMessage = await setPlayInday(event, false);
      await resetMainRound(event);
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: closeIndayMessage,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return sendErrorMessage(
      event,
      "เกิดข้อผิดพลาดในการปิดบ้านไก่ชน กรุณาลองใหม่"
    );
  }
}

// Handle เปิดรอบเล่นหลัก
async function handleOpenMainPlayCommand(event) {
  try {
    const playInday = await checkOpenPlayInday(event);
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    let openMainMessage;
    if (playInday) {
      await setNumberMainRound(event);
      openMainMessage = await setMainPlay(event, "open");
    } else {
      openMainMessage = "ยังไม่ได้เปิดบ้านไก่ชน!!!";
    }
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: openMainMessage,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return sendErrorMessage(event, "เกิดข้อผิดพลาดในการเปิดรอบ กรุณาลองใหม่");
  }
}

// Handle ปิดรอบเล่นหลัก
async function handleCloseMainPlayCommand(event) {
  try {
    const playInday = await checkOpenPlayInday(event);
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    if (!permissionResult.success) {
      return null;
    }

    let closeMainMessage;

    if (playInday) {
      closeMainMessage = await updateMainPlay(event, "close");
    } else {
      return null;
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: closeMainMessage,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return sendErrorMessage(event, "เกิดข้อผิดพลาดในการเปิดรอบ กรุณาลองใหม่");
  }
}

async function handleSetOdds(event, { type, odds, maxAmount }) {
  try {
    // ตรวจสอบสิทธิ์ผู้ใช้งาน
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);
    const isSubRoundOpen = await checkPreviousSubRoundStatus();

    if (!permissionResult.success) {
      console.log("ไม่มีสิทธิ์ใช้คำสั่งนี้");
      const replyMessage = {
        type: "text",
        text: "คุณไม่มีสิทธิ์ใช้คำสั่งนี้!!!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }

    // ตรวจสอบสถานะรอบเล่น
    const isOpenMainStatus = await checkPreviousRoundStatus();
    if (!isOpenMainStatus) {
      const replyMessage = {
        type: "text",
        text: "ยังไม่เปิดรอบเล่น!!!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }

    if (isSubRoundOpen) {
      console.log("ไม่มีสิทธิ์ใช้คำสั่งนี้");
      const replyMessage = {
        type: "text",
        text: "ราคาเล่นเปิดอยู่ กรุณาปิดก่อนตั้งราคาใหม่!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }

    let oddsValue;
    if (odds) {
      oddsValue = parseFloat(odds.match(/[\d.]+/g)?.[0]);
    }

    let oddsText;

    const fixedOddsText = {
      ตร: "\n• ฝั่งต่อ: ต่อ 10 ได้ 9\n• ฝั่งรอง: ต่อ 10 ได้ 9",
      สง: "\n• ฝั่งต่อ (น้ำเงิน): ต่อ 10 ได้ 8\n• ฝั่งรอง (แดง): ต่อ 10 ได้ 10",
      สด: "\n• ฝั่งต่อ (แดง): ต่อ 10 ได้ 8\n• ฝั่งรอง (น้ำเงิน): ต่อ 10 ได้ 10",
    };

    if (fixedOddsText[type]) {
      oddsText = fixedOddsText[type];
    } else if ((type === "ด" || type === "ง") && !isNaN(oddsValue)) {
      oddsText = calculateOddsText(type, oddsValue);
    } else {
      oddsText = "\n• ไม่สามารถคำนวณอัตราได้ เนื่องจากข้อมูลไม่ถูกต้อง";
    }

    let oddsToSend = type;
    if (type !== "ตร" && type !== "สง" && type !== "สด" && !isNaN(oddsValue)) {
      oddsToSend = type + oddsValue;
    }

    // เรียก setOpenOdds และตรวจสอบผลลัพธ์
    const addOdds = await setOpenOdds(event, oddsToSend);
    if (addOdds) {
      const replyMessage = {
        type: "text",
        text: `จำนวนเงินสูงสุด: ${maxAmount}${oddsText}`,
      };

      await client.replyMessage(event.replyToken, replyMessage);
    } else {
      // ถ้า setOpenOdds ไม่ทำงาน
      console.log("ไม่สามารถตั้งราคาได้");
      const replyMessage = {
        type: "text",
        text: "ไม่สามารถตั้งราคาได้!!!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }
  } catch (error) {
    // จัดการข้อผิดพลาด
    console.error("เกิดข้อผิดพลาดใน handleSetOdds:", error);

    const replyMessage = {
      type: "text",
      text: "เกิดข้อผิดพลาดในการตั้งค่าอัตรา!!! กรุณาลองใหม่อีกครั้ง.",
    };

    await client.replyMessage(event.replyToken, replyMessage);
  }
}

async function handleCloseSetOdds(event) {
  try {
    // ตรวจสอบสิทธิ์ผู้ใช้งาน
    const permissionResult = await checkUserRole(event, [
      "Superadmin",
      "Admin",
    ]);

    if (!permissionResult.success) {
      console.log("ไม่มีสิทธิ์ใช้คำสั่งนี้");
      const replyMessage = {
        type: "text",
        text: "คุณไม่มีสิทธิ์ใช้คำสั่งนี้!!!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }

    // ตรวจสอบสถานะรอบเล่นหลัก
    const isOpenMainStatus = await checkPreviousRoundStatus();
    if (!isOpenMainStatus) {
      const replyMessage = {
        type: "text",
        text: "ยังไม่เปิดรอบเล่น!!!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }

    // ตรวจสอบสถานะรอบเล่นย่อย
    const isSubRoundOpen = await checkPreviousSubRoundStatus();
    if (!isSubRoundOpen) {
      console.log("ยังไม่ได้ตั้ง!");
      const replyMessage = {
        type: "text",
        text: "ราคาเล่นเปิดอยู่ กรุณาปิดก่อนตั้งราคาใหม่!",
      };
      return await client.replyMessage(event.replyToken, replyMessage);
    }

    // เรียกฟังก์ชันปิดรอบ
    const response = await setCloseOdds(event);

    // ตรวจสอบผลลัพธ์จากการปิดรอบ
    const replyMessage = {
      type: "text",
      text: response || "ไม่สามารถปิดรอบได้! กรุณาลองใหม่.",
    };
    return await client.replyMessage(event.replyToken, replyMessage);
  } catch (error) {
    console.error("Error in handleCloseSetOdds:", error);
    return sendErrorMessage(event, "เกิดข้อผิดพลาดในการปิดรอบ กรุณาลองใหม่");
  }
}

// ฟังก์ชันสำหรับคำนวณราคาฝั่งต่อและรอง
function calculateOddsText(type, oddsValue) {
  const oddsMap = {
    8.5: { ต่อ: 7.5, รอง: 9.5 },
    8: { ต่อ: 7, รอง: 9 },
    7.5: { ต่อ: 6.5, รอง: 8.5 },
    7: { ต่อ: 6, รอง: 8 },
    6.5: { ต่อ: 5.5, รอง: 7.5 },
    6: { ต่อ: 5, รอง: 7 },
    5.5: { ต่อ: 4.5, รอง: 6.5 },
    5: { ต่อ: 4, รอง: 6 },
    4.5: { ต่อ: 3.5, รอง: 5.5 },
    4: { ต่อ: 3, รอง: 5 },
    3.5: { ต่อ: 2.5, รอง: 4.5 },
    3: { ต่อ: 2, รอง: 4 },
    2.5: { ต่อ: 1.5, รอง: 3.5 },
    2: { ต่อ: 1, รอง: 3 },
    1: { ต่อ: 0.1, รอง: 1.0 },
    100: { ต่อ: 0.1, รอง: 15 },
  };

  const odds = oddsMap[oddsValue];
  if (!odds) return "\n• ไม่สามารถคำนวณอัตราได้ เนื่องจากข้อมูลไม่ถูกต้อง";

  const side = type === "ด" ? "แดง" : "น้ำเงิน";
  return `\n• ฝั่งต่อ (${side}): ต่อ 10 ได้ ${odds.ต่อ}\n• ฝั่งรอง (${
    side === "แดง" ? "น้ำเงิน" : "แดง"
  }): รอง ${odds.รอง} ได้ 10`;
}

// Helper function to send error messages
function sendErrorMessage(event, message) {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: message,
  });
}

module.exports = {
  sendErrorMessage,
  handleUserCheckMoney,
  handleUserDetails,
  handleTestDetails,
  handleSetCockCommand,
  handleBankAccountDetails,
  handleSetHiloCommand,
  handleWithdrawMoney,
  handleCashCustomer,
  handleTopUpCredit,
  handleUpdateAdminRole,
  handleAddAllMembers,
  handleSetGroupCommand,
  handleSetSubGroupCommand,
  handleOpenIndayCommand,
  handleCloseIndayCommand,
  handleOpenMainPlayCommand,
  handleCloseMainPlayCommand,
  handleSetOdds,
  handleCloseSetOdds,
};
