#!/bin/bash
# Rollback script for Story Bell Queue System

echo "🔄 Rolling back queue system implementation..."

# Restore from backup
if [ -d "backup_before_queue" ]; then
    cp -f backup_before_queue/*.html .
    echo "✓ HTML files restored from backup"

    # Remove queue assets
    rm -rf queue_assets
    echo "✓ Queue assets removed"

    # Remove summary files
    rm -f queue_implementation_summary.json
    rm -f queue_verification_report.json
    rm -f sample-queue-export-*.json
    echo "✓ Summary files removed"

    echo "✅ Rollback complete!"
else
    echo "❌ Backup directory not found. Cannot rollback."
fi
