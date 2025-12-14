use aiken/collection/list
use aiken/primitive/bytearray
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{PolicyId}

pub type BadgeDatum {
  BadgeDatum {
    owner: VerificationKeyHash,
    level: Int,
    policy_id: PolicyId,
  }
}

pub type BadgeRedeemer {
  Upgrade { new_level: Int }
  Retire
}

pub type BadgeLevel {
  BadgeLevel {
    level: Int,
    title: String,
  }
}

pub fn badge_levels() -> List<BadgeLevel> {
  [
    BadgeLevel { level: 0, title: @"New Member" },
    BadgeLevel { level: 1, title: @"Trusted Member" },
    BadgeLevel { level: 2, title: @"Verified Contributor" },
    BadgeLevel { level: 3, title: @"Community Pillar" },
    BadgeLevel { level: 4, title: @"Elder / Leader" },
  ]
}

pub fn is_valid_level(target: Int) -> Bool {
  badge_levels()
    |> list.any(fn(level) { level.level == target })
}

pub fn ensure_level(target: Int) -> Bool {
  is_valid_level(target)
}

pub fn badge_asset_name(owner: VerificationKeyHash, level: Int) -> ByteArray {
  // Asset names are limited to 32 bytes.
  // Compact format: 0x59 ('Y') || level_u8 || owner_vkh(28 bytes)
  // Total = 1 + 1 + 28 = 30 bytes.
  bytearray.concat(#"59", bytearray.concat(bytearray.from_int_big_endian(level, 1), owner))
}
